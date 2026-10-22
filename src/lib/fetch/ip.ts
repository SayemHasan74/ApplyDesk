import 'server-only';
import { BlockList, isIP } from 'node:net';

const blocked = new BlockList();
for (const subnet of ['0.0.0.0/8', '10.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8', '169.254.0.0/16',
  '172.16.0.0/12', '192.0.0.0/24', '192.0.2.0/24', '192.88.99.0/24', '192.168.0.0/16',
  '198.18.0.0/15', '198.51.100.0/24', '203.0.113.0/24', '224.0.0.0/4', '240.0.0.0/4']) {
  const [ip, bits] = subnet.split('/');
  blocked.addSubnet(ip, Number(bits), 'ipv4');
}
for (const subnet of ['::/128', '::1/128', 'fc00::/7', 'fe80::/10', 'ff00::/8', '2001:db8::/32', '2002::/16', '64:ff9b::/96']) {
  const [ip, bits] = subnet.split('/');
  blocked.addSubnet(ip, Number(bits), 'ipv6');
}
export function isPublicIp(ip: string): boolean {
  if (ip.includes('%')) return false;
  const family = isIP(ip);
  if (!family) return false;
  if (family === 6) {
    const normalized = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
    const mapped = /^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/i.exec(normalized);
    if (mapped) {
      const value = parseInt(mapped[1], 16) * 65536 + parseInt(mapped[2], 16);
      return isPublicIp([24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join('.'));
    }
  }
  return !blocked.check(ip, family === 4 ? 'ipv4' : 'ipv6');
}
