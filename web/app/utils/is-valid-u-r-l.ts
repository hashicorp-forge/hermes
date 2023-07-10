export default async function isValidURL(string: string): Promise<boolean> {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}
