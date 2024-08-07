import { Feed } from 'picofeed'
import { Memory, SimpleKernel } from 'picostack'
import { Modem56 } from 'picostack/modem56.js'
import { MemoryLevel } from 'memory-level'
export const WORLD_SIZE = 9
const MEM_PLAYERS = 'p'
const MOVES = [1, 2, 3, 4, 5]
export const [A, L, R, U, D] = MOVES

export class Kernel extends SimpleKernel {
  #m56 = null
  #feed = new Feed()
  constructor (db) {
    super(db)
    this.store.repo.allowDetached = true // TODO:picostore: this obscure line will be default in final release
    this.store.register(MEM_PLAYERS, PlayerMemory)
  }

  /** TODO: export a convenience method in picostore to locate memoryslices
    * @type {PlayerMemory} */
  get pmem () { return this.store.roots[MEM_PLAYERS] }

  async spawn (name) {
    const branch = this.#feed
    await this.pmem.spawn(branch, name, this._secret)
  }

  async nextTurn () {
    return this.pmem.readState(this.pk)
  }

  async commitMoves (moves) {
    if (!Array.isArray(moves)) throw new Error('Expected Array')
    if (moves.find(m => !~MOVES.indexOf(m))) throw new Error('Unknown Move')
    const branch = this.#feed
    this.pmem.commitMoves(branch, moves, this._secret)
  }

  async beginSwarm (swarm) {
    const topic = 'pbomb:v0/global'
    this.#m56 = new Modem56(swarm)
    this.leaveSwarm = await this.#m56.join(topic, this.spawnWire.bind(this), true)
  }

}

class PlayerMemory extends Memory {
  initialValue = {
    name: 'Anonymous',
    dead: false, // Killed by CHAIN&|AUTHOR
    bombs: 1,
    flame: 3,
    speed: 4,
    x: -1,
    y: -1
  }

  idOf ({ CHAIN }) { return CHAIN } // TODO:picostore: make CHAIN default.

  /** @type {import('@telamon/picostore').ComputeFunction} */
  async compute (value, ctx) {
    const { payload, reject, lookup, AUTHOR, block, index, signal, date } = ctx

    const { type } = payload
    switch (type) {
      case 'spawn': {
        if (!block.genesis) return reject('Genesis Expected')
        const a = await lookup(AUTHOR)
        if (a) return reject('AUTHOR already exists')
        const { name } = payload
        if (typeof name !== 'string' && name.length && name.length < 16) return reject('Invalid Name')
        index(AUTHOR)

        let x = block.sig[1] % WORLD_SIZE
        const y = block.sig[2] % WORLD_SIZE
        if (isWall(x, y)) x = (x + 1) % WORLD_SIZE

        return {...value, name, x, y }
      }
      case 'turn': {
        const { moves } = payload
        if (!Array.isArray(moves)) return reject('Expected Array')
        if (moves.find(m => !~MOVES.indexOf(m))) return reject('Unknown Move')
        const p = JSON.parse(JSON.stringify(value))
        let distance = 0
        for (const move of moves) {
          if (move === A) {
            signal('spawn-bomb', { x: p.x, y: p.y, date })
            continue
          }

          if (distance > p.speed) return reject('Speedhack')
          let x = p.x
          let y = p.y

          if (move === U) y--
          else if (move === D) y++
          else if (move === L) x--
          else if (move === R) x++
          else throw new Error('unreachable')
          if ( // Collision detection
            !isWall(x, y) &&
            x >= 0 && x < WORLD_SIZE &&
            y >= 0 && y < WORLD_SIZE
          ) { p.x = x; p.y = y }
          distance++
        }
        return p
      }
      default: return reject(`Unknown block: ${type}`)
    }
  }

  async spawn (branch, name, secret) {
    this.createBlock(branch, { type: 'spawn', name }, secret)
  }

  async commitMoves (branch, moves, secret) {
    this.createBlock(branch, { type: 'turn', moves }, secret)
  }
}

export async function boot (swarm, cb) {
  console.log('boot() called, allocating memory')
  const DB = new MemoryLevel('picobomber.lvl', {
    valueEncoding: 'buffer',
    keyEncoding: 'buffer'
  })
  const kernel = new Kernel(DB)
  await kernel.boot()
  globalThis.K = kernel
  if (swarm) await kernel.beginSwarm(swarm)
  if (typeof cb === 'function') cb(kernel)
  return kernel
}

// simple gridlike level design
export function isWall(x, y) { return x % 2 && y % 2 }
