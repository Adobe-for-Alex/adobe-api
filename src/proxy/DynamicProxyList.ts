import { HttpsProxyAgent } from "https-proxy-agent";
import { Proxy, ProxyEntry } from "./Proxy";
import axios from "axios";

export class DynamicProxyList implements Proxy {
  constructor(
    private readonly list: URL,
    private readonly testUrl: URL,
    private readonly testTimeout: number
  ) { }

  async entry(): Promise<ProxyEntry> {
    try {
      const response = await fetch(this.list)
      const proxies = await response.json() as string[]
      for (const timeout of [1, 2, 3, 4, 5].map(x => x * this.testTimeout)) {
        console.log('Proxy test with timeout', timeout)
        const validProxies = (await Promise.all(proxies.map(async proxy => {
          try {
            const agent = new HttpsProxyAgent(`http://${proxy}`)
            const controller = new AbortController()
            setTimeout(() => controller.abort(), timeout)
            await axios.get(this.testUrl.toString(), {
              httpAgent: agent,
              httpsAgent: agent,
              signal: controller.signal,
            })
            console.log(`Proxy ${proxy} is valid`)
            return proxy
          } catch (e) {
            console.log(`Proxy ${proxy} failed ${e}`)
            return undefined
          }
        }))).filter(x => x !== undefined)
        const firstValidProxy = validProxies[0]
        if (firstValidProxy === undefined) continue
        const [host, port] = firstValidProxy.split(':')
        if (host === undefined || port === undefined) throw new Error(`Invalid format for proxy: ${firstValidProxy}`)
        return { host, port: Number.parseInt(port) }
      }
      throw new Error(`No valid proxies in ${proxies.join(', ')}`)
    } catch (e) {
      console.error('Failed to choose proxy')
      throw e
    }
  }
}
