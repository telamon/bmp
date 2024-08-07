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
    text: 'InfinityBomber\n💣',
    style: { fontSize: 72, align: 'center' }
  })
  container.addChild(title)
  title.x = app.canvas.width / 2 - title.width / 2
  title.y = 100

  const t2 = new Text({
    text: 'Press start to play',
    style: {
      fontFamily: 'monospace',
      fontSize: 32,
      fill: 'white'
    }
  })
  container.addChild(t2)
  t2.x = app.canvas.width / 2 - t2.width / 2
  t2.y = app.canvas.height - t2.height - 50
  const el = document.createElement('input')
  el.type = 'text'
  el.placeholder = 'Name'
  el.style.position = 'absolute'
  el.style.padding = "10px 10px"
  document.body.appendChild(el)
  el.style.top = (app.canvas.height / 2) + 'px'
  el.style.left = (app.canvas.width / 2 - el.getBoundingClientRect().width / 2) + 'px'
  return container
}

let gTime = 0
/** @param {import('pixi.js').Ticker} ticker */
function loop (ticker) {
  const { deltaTime } = ticker
  gTime += deltaTime
  // console.log('processing', ticker.deltaTime)
  const dim = (WORLD_SIZE * TILE_SIZE)
  world.position.x = (world.position.x - deltaTime) % (TILE_SIZE * 2)
  world.position.y = (world.position.y - deltaTime) % (TILE_SIZE * 2)
  // world.position.x = (1 + Math.sin(gTime * 0.01) / 2) * -50
  // world.position.y = (1 + Math.sin(gTime * 0.01) / 2) * dim
  // world.scale.x = world.scale.y = Math.min(1, Math.max(Math.cos(gTime * 0.01)), 0.3)
}

main()

// document.onload = main
