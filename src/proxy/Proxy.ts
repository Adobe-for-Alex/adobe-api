export type ProxyEntry = {
  host: string
  port: number
}

export interface Proxy {
  entry(): Promise<ProxyEntry>
}
