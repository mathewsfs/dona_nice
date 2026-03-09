const fs = require('fs')
const path = require('path')

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Pasta não encontrada: ${src}`)
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

const root = path.join(__dirname, '..')
const frontendDist = path.join(root, '..', 'frontend', 'dist')
const backendPublic = path.join(root, 'public')

// Limpa public antes de copiar
if (fs.existsSync(backendPublic)) {
  fs.rmSync(backendPublic, { recursive: true, force: true })
}

copyDirSync(frontendDist, backendPublic)
console.log(`Frontend dist copiado para: ${backendPublic}`)
