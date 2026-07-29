const BASE36 = '0123456789abcdefghijklmnopqrstuvwxyz'

export function slugId(name: string, rand: () => number = Math.random): string {
  const slug =
    name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'med'
  let suffix = ''
  for (let i = 0; i < 4; i++) suffix += BASE36[Math.floor(rand() * 36)]
  return `${slug}-${suffix}`
}
