import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;

  return NextResponse.json({
    message: 'Middleware test',
    token: token ? 'present' : 'absent',
    tokenValue: token,
    headers: Object.fromEntries(request.headers.entries()),
    cookies: Object.fromEntries(
      Array.from(request.cookies.getAll()).map(cookie => [cookie.name, cookie.value])
    )
  });
}
