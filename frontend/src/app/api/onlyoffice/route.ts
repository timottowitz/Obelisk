import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
  const secret = '064bb63b9ff843e28f06c18fa9a4c735';
  const config = await req.json();
  const token = jwt.sign(config, secret, {
    algorithm: 'HS256',
    expiresIn: '10m'
  });
  return Response.json({ token });
}
