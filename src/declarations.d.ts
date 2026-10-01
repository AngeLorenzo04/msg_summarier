declare module 'input' {
  export function text(message: string): Promise<string>;
  export function password(message: string): Promise<string>;
  export function confirm(message: string): Promise<boolean>;
  export function select(message: string, choices: any[]): Promise<string>;
}
