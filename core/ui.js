import { boot, WORLD_SIZE, isWall } from './index.js'
import {
  Application,
  Graphics,
  BitmapText,
  Text,
  Container
} from 'pixi.js'

const TILE_SIZE = 64

/** @type {Application} */
let app = null

/** @type {Graphics} */
let world = null

let SCENE = 'title';

async function main () {
  console.log('Booting up')
  const kernel = await boot()
  app = new Application()
  await app.init({ width: 820, height: 600 })
  document.body.appendChild(app.canvas)
  app.ticker.add(loop)

  world = new Graphics()
    .rect(0, 0, WORLD_SIZE * TILE_SIZE, WORLD_SIZE * TILE_SIZE)
    .fill('gray')
  world.setStrokeStyle({ color: 'black', width: 3 })
  for (let i = 0; i < WORLD_SIZE; i++) {
    // Draw Horizontal grid
    world.moveTo(i * TILE_SIZE, 0)
      .lineTo(i * TILE_SIZE, WORLD_SIZE * TILE_SIZE)
      .stroke()
    // Vertical
    world.moveTo(0, i * TILE_SIZE)
      .lineTo(WORLD_SIZE * TILE_SIZE, i * TILE_SIZE)
      .stroke()
  }
  for (let y = 0; y < WORLD_SIZE; y++) {
    for (let x = 0; x < WORLD_SIZE; x++) {
      if (isWall(x, y)) {
        const m = 4
        world.rect(m + x * TILE_SIZE, m + y * TILE_SIZE, TILE_SIZE - m * 2, TILE_SIZE - m * 2).fill('#333')
        // const r = TILE_SIZE / 2 - 8
        // world.circle(TILE_SIZE / 2 + x * TILE_SIZE, TILE_SIZE / 2 + y * TILE_SIZE, r).fill('purple')
      }
    }
  }
  app.stage.addChild(world)
  app.stage.addChild(await renderTitleScreen())
}

/** @returns {Promise<Container>} */
async function renderTitleScreen () {
  const container = new Container()
  container.label = 'scene:title'

  const title = new BitmapText({
    text: 'InfinityBomber',
    style: { fontSize: 72, align: 'center' }
  })
  container.addChild(title)
  title.x = app.canvas.width / 2 - title.width / 2
  title.y = 100
  /** @type{import('pixi.js).TextOptions} */
  const o = {
    text: 'bob'
  }
  const t2 = new Text({
    text: 'Press play on start',
    style: {
      fontFamily: 'monospace',
      size: 72,
      fontColor: '#f00fe0'
    }
  })
  container.addChild(t2)
  return container
}

let gTime = 0
/** @param {import('pixi.js').Ticker} ticker */
function loop (ticker) {
  const { deltaTime } = ticker
  gTime += deltaTime
  // console.log('processing', ticker.deltaTime)
  world.position.x = 50 * Math.sin(gTime * 0.01)
  world.position.y = 50 * Math.cos(gTime * 0.01)
  // world.scale.x = world.scale.y = Math.min(1, Math.max(Math.cos(gTime * 0.01)), 0.3)
}

main()

// document.onload = main
