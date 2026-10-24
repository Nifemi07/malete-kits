// Optimize product images: resize to max 900px, convert to webp, quality 80
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const dir = '/home/z/my-project/public/images/products'
const heroDir = '/home/z/my-project/public/images'

async function optimizeDir(dir, isHero = false) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const full = path.join(dir, file)
    if (!/\.(jpe?g|png|webp)$/i.test(file)) continue
    const out = full.replace(/\.(jpe?g|png|webp)$/i, '.webp')
    try {
      if (isHero) {
        await sharp(full).resize(1800, null, { withoutEnlargement: true }).webp({ quality: 78 }).toFile(out)
      } else {
        await sharp(full).resize(900, 1100, { fit: 'cover', withoutEnlargement: false }).webp({ quality: 80 }).toFile(out)
      }
      const before = fs.statSync(full).size
      const after = fs.statSync(out).size
      if (out !== full) fs.unlinkSync(full)
      console.log(`${path.basename(out)}: ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB`)
    } catch (e) {
      console.error(`FAIL ${file}: ${e.message}`)
    }
  }
}

;(async () => {
  await optimizeDir(dir)
  await optimizeDir(heroDir, true)
  console.log('OPTIMIZATION DONE')
})()
