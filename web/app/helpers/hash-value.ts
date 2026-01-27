/**
 * Get value from the provided `options` based on the hash of `source`.
 *
 * @param source String to hash.
 * @param options Collection of options to get value from.
 */
export default function hashValue<T>(source: string, options: T[]): T | null{
    let hash = 0;
    if (source.length === 0 || options.length === 0) {
        return null;
    }
    for (let i = 0; i < source.length; i++) {
        hash = source.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
    }
    hash = ((hash % options.length) + options.length) % options.length;
    const res = options[hash];
    if (res === undefined) {
        return null;
    }
    return res as T;
}