import jwt from 'jsonwebtoken';
import "dotenv/config";

export async function POST(req: Request) {
  const secret = process.env.NEXT_PUBLIC_ONLYOFFICE_SECURITY_TOKEN!;
  const config = await req.json();
  const token = jwt.sign(config, secret, {
    algorithm: 'HS256',
    expiresIn: '10m'
  });
  return Response.json({ token });
}
