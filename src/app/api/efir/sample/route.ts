
import { NextResponse } from "next/server";


// ✅ GET → just for testing (optional)
export async function GET() {
  return NextResponse.json({
    message: "FIR API working",
  });
}


// ✅ POST → MAIN FIR LOGIC
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ✅ Generate UNIQUE FIR NUMBER
    const firNumber = "FIR-" + Date.now();

    // ✅ Create FIR object
    const newFIR = {
      firNumber,
      name: body.name,
      phone: body.phone,
      complaint: body.complaint,
      createdAt: new Date(),
    };

    console.log("Saved FIR:", newFIR);

    // 👉 TODO: Save in DB
    // await prisma.fir.create({ data: newFIR });

    return NextResponse.json({
      success: true,
      firNumber,
    });

  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Error creating FIR" },
      { status: 500 }
    );
  }
}
