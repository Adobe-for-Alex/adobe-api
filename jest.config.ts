import { Config } from "jest";

const config: Config = {
  passWithNoTests: true,
  testEnvironment: 'node',
  transform: {
    '^.+.ts$': ['ts-jest', {}],
  },
}
export default config
