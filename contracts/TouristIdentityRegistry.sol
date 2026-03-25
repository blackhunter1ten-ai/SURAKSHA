// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title TouristIdentityRegistry
/// @notice Time-bound on-chain tourist digital IDs with KYC commitment, itinerary, emergency contacts,
///         and append-only activity logs (location updates & safety alerts). Fits SIH/demo flows;
///         store large KYC payloads off-chain (IPFS) and pass `kycDataHash` (e.g. keccak256 of CID bytes).
contract TouristIdentityRegistry {
    address public authority;

    struct TouristIdentity {
        bytes32 kycDataHash;
        string itinerary;
        string emergencyContacts;
        uint64 issuedAt;
        uint64 validUntil;
        bool revoked;
    }

    uint256 private _nextTokenId;
    mapping(uint256 => TouristIdentity) private _identities;
    mapping(address => uint256) private _ownerOf;
    mapping(uint256 => address) private _tokenHolder;

    event TouristIDIssued(
        uint256 indexed tokenId,
        address indexed holder,
        bytes32 kycDataHash,
        uint64 validUntil
    );
    event LocationUpdateRecorded(uint256 indexed tokenId, address indexed recorder, string latLng, uint256 timestamp);
    event SafetyAlertRecorded(uint256 indexed tokenId, address indexed recorder, string description, uint256 timestamp);
    event IdentityRevoked(uint256 indexed tokenId, address indexed authority_);

    error NotAuthority();
    error AlreadyHasIdentity();
    error UnknownToken();
    error IdentityExpiredOrRevoked();
    error InvalidValidityPeriod();
    error InvalidHolder();
    error NotTokenHolder();

    modifier onlyAuthority() {
        if (msg.sender != authority) revert NotAuthority();
        _;
    }

    modifier onlyTokenHolder(uint256 tokenId) {
        if (_tokenHolder[tokenId] != msg.sender) revert NotTokenHolder();
        _;
    }

    constructor(address initialAuthority) {
        authority = initialAuthority;
        _nextTokenId = 1;
    }

    /// @notice Transfer admin rights (e.g. multisig / ministry wallet).
    function setAuthority(address newAuthority) external onlyAuthority {
        authority = newAuthority;
    }

    /// @notice Mint a non-transferable logical "NFT" style ID: one active ID per address.
    function issueTouristIdentity(
        address holder,
        bytes32 kycDataHash,
        string calldata itinerary,
        string calldata emergencyContacts,
        uint64 validUntil
    ) external onlyAuthority returns (uint256 tokenId) {
        if (holder == address(0)) revert InvalidHolder();
        if (_ownerOf[holder] != 0) revert AlreadyHasIdentity();
        uint64 nowTs = uint64(block.timestamp);
        if (validUntil <= nowTs) revert InvalidValidityPeriod();

        tokenId = _nextTokenId++;
        _identities[tokenId] = TouristIdentity({
            kycDataHash: kycDataHash,
            itinerary: itinerary,
            emergencyContacts: emergencyContacts,
            issuedAt: nowTs,
            validUntil: validUntil,
            revoked: false
        });
        _ownerOf[holder] = tokenId;
        _tokenHolder[tokenId] = holder;

        emit TouristIDIssued(tokenId, holder, kycDataHash, validUntil);
    }

    function tokenIdOf(address holder) external view returns (uint256) {
        return _ownerOf[holder];
    }

    function holderOf(uint256 tokenId) external view returns (address) {
        return _tokenHolder[tokenId];
    }

    function getIdentity(uint256 tokenId) external view returns (TouristIdentity memory) {
        if (_tokenHolder[tokenId] == address(0)) revert UnknownToken();
        return _identities[tokenId];
    }

    function isValid(uint256 tokenId) public view returns (bool) {
        address h = _tokenHolder[tokenId];
        if (h == address(0)) return false;
        TouristIdentity storage id = _identities[tokenId];
        if (id.revoked) return false;
        if (block.timestamp > id.validUntil) return false;
        return true;
    }

    /// @notice Log a GPS fix or derived location hash on-chain.
    function recordLocationUpdate(uint256 tokenId, string calldata latLng) external onlyTokenHolder(tokenId) {
        if (!isValid(tokenId)) revert IdentityExpiredOrRevoked();
        emit LocationUpdateRecorded(tokenId, msg.sender, latLng, block.timestamp);
    }

    /// @notice Log a safety / geofence / SOS style event tied to this ID.
    function recordSafetyAlert(uint256 tokenId, string calldata description) external onlyTokenHolder(tokenId) {
        if (!isValid(tokenId)) revert IdentityExpiredOrRevoked();
        emit SafetyAlertRecorded(tokenId, msg.sender, description, block.timestamp);
    }

    /// @notice Authority can anchor a safety alert when the tourist wallet does not sign.
    function recordSafetyAlertFromAuthority(uint256 tokenId, string calldata description) external onlyAuthority {
        if (!isValid(tokenId)) revert IdentityExpiredOrRevoked();
        emit SafetyAlertRecorded(tokenId, msg.sender, description, block.timestamp);
    }

    /// @notice Authority can invalidate an ID before natural expiry.
    function revokeIdentity(uint256 tokenId) external onlyAuthority {
        if (_tokenHolder[tokenId] == address(0)) revert UnknownToken();
        _identities[tokenId].revoked = true;
        emit IdentityRevoked(tokenId, msg.sender);
    }

    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }
}
