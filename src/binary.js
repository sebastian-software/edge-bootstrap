/* eslint-disable no-console, security/detect-non-literal-fs-filename, security/detect-object-injection */
import chalk from "chalk"
import mkdirp from "mkdirp"
import tar from "tar"

import fs from "fs"
import util from "util"
import path from "path"

import pkg from "../package.json"

const fsAccess = util.promisify(fs.access)
const fsReadFile = util.promisify(fs.readFile)
const CWD = process.cwd()

const IS_INTERACTIVE = process.stdout.isTTY

if (IS_INTERACTIVE) {
  process.stdout.write(process.platform === "win32" ? "\x1Bc" : "\x1B[2J\x1B[3J\x1B[H")
}

function writePackageJson(packageJsonPath, baseObj, templateObj) {
  const newContent = Object.assign({}, baseObj)

  for (const key of [ "main", "bin", "files" ]) newContent[key] = templateObj[key]

  for (const key of [ "scripts", "dependencies", "devDependencies" ]) {
    newContent[key] = newContent[key] || {}

    for (const valueKeys of Object.keys(templateObj[key])) {
      newContent[key][valueKeys] = templateObj[key][valueKeys]
    }
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(newContent, null, 2))
}

async function main() {
  console.log(chalk.bold(`edge bootstrap ${chalk.green(`v${pkg.version}`)}`))
  console.log()

  const packageJsonPath = path.join(CWD, "package.json")
  try {
    await fsAccess(packageJsonPath)
  } catch (error) {
    console.log(chalk.red(`No package.json found in current path ${CWD}`))
    console.log(
      chalk.cyan(`> You might want to run ${chalk.white.bold("npm init")} first`)
    )
    return
  }

  const templatePath = path.join(__dirname, "..", "template.tar")
  try {
    await fsAccess(templatePath)
  } catch (error) {
    console.log(chalk.red(`No template.tar found in path ${__dirname}/..`))
    return
  }

  const packageJsonContent = JSON.parse(await fsReadFile(packageJsonPath, "utf8"))

  const tarParser = new tar.Parse()
  fs
    .createReadStream(templatePath)
    .pipe(tarParser)
    .on("entry", (entry) => {
      console.log(">> ", entry.path, entry.type)
      const entryPath = path.join(CWD, entry.path)

      if (entry.type === "Directory") {
        mkdirp(entryPath, () => {
          entry.resume()
        })
      } else if (entry.type === "File") {
        if (entry.path.endsWith("/package.json")) {
          entry.on("data", (data) => {
            const templatePackageJson = JSON.parse(data.toString())

            writePackageJson(packageJsonPath, packageJsonContent, templatePackageJson)
          })
        } else {
          entry.pipe(fs.createWriteStream(entryPath))
        }
      }
    })
}

main().catch((error) => console.log(chalk.red(error.stack)))
