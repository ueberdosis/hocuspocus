import { Redis } from './Redis'

export class RedisCluster extends Redis {

  cluster = true

}
