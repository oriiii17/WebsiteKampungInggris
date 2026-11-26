import { NextResponse } from "next/server";

function unavailable() {
  return NextResponse.json({ error: "Fitur ulasan sudah tidak tersedia." }, { status: 410 });
}

export const GET = unavailable;
export const POST = unavailable;
export const PATCH = unavailable;
export const DELETE = unavailable;
