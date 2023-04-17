export default async (files: string[]) => {
  await Promise.all(files.map(file => import(file + '?t=' + Date.now())))
}
