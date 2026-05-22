declare module "png-chunks-extract" {
  function extract(data: Uint8Array): Array<{ name: string; data: Uint8Array }>;
  export = extract;
}

declare module "png-chunks-encode" {
  function encode(chunks: Array<{ name: string; data: Uint8Array }>): Uint8Array;
  export = encode;
}

declare module "png-chunk-text" {
  function encode(keyword: string, value: string): { name: string; data: Uint8Array };
  function decode(data: Uint8Array): { keyword: string; text: string };
  export { encode, decode };
}
