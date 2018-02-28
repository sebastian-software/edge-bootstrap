/* eslint-disable security/detect-non-literal-fs-filename, security/detect-object-injection */
import chalk from "chalk"
import mkdirp from "mkdirp"
import tarchive from "tar"
import oraSpinner from "ora"
import clipboardy from "clipboardy"

import fs from "fs"
import util from "util"
import path from "path"

import { write, writeLn } from "./console"
import { gitIgnoreContent, readmeContent } from "./templateFiles"

import pkg from "../package.json"

const fsAccess = util.promisify(fs.access)
const fsReadFile = util.promisify(fs.readFile)
const CWD = process.cwd()

const PACKAGE_JSON_FILES_SECTION = [ "docs/", "build/", "bin/", ".edgerc.yml" ]

const IS_INTERACTIVE = process.stdout.isTTY

if (IS_INTERACTIVE) {
  write(process.platform === "win32" ? "\x1Bc" : "\x1B[2J\x1B[3J\x1B[H")
}

function writePackageJson(packageJsonPath, baseObj, templateObj) {
  const newContent = { ...baseObj }

  for (const key of [ "main", "module", "bin" ]) {
    if (key in templateObj) {
      newContent[key] = templateObj[key]
    }
  }

  for (const key of [ "scripts", "dependencies", "devDependencies" ]) {
    newContent[key] = newContent[key] || {}

    if (key in templateObj) {
      for (const valueKeys of Object.keys(templateObj[key])) {
        newContent[key][valueKeys] = templateObj[key][valueKeys]
      }
    }
  }

  newContent.files = PACKAGE_JSON_FILES_SECTION

  fs.writeFileSync(packageJsonPath, JSON.stringify(newContent, null, 2))
}

async function main() {
  writeLn(chalk.bold(`edge create ${chalk.green(`v${pkg.version}`)}`))
  writeLn()

  const packageJsonPath = path.join(CWD, "package.json")
  try {
    await fsAccess(packageJsonPath)
  } catch (error) {
    writeLn(chalk.red(`No package.json found in current path ${CWD}`))
    writeLn(chalk.cyan(`> You might want to run ${chalk.white.bold("npm init")} first`))
    return
  }

  const templatePath = path.join(__dirname, "..", "template.tar")
  try {
    await fsAccess(templatePath)
  } catch (error) {
    writeLn(chalk.red(`No template.tar found in path ${__dirname}/..`))
    return
  }

  const packageJsonContent = JSON.parse(await fsReadFile(packageJsonPath, "utf8"))

  const spinner = oraSpinner("Write project files from template").start()

  const tarParser = new tarchive.Parse()
  fs
    .createReadStream(templatePath)
    .pipe(tarParser)
    .on("entry", (entry) => {
      const entryPath = path.join(CWD, entry.path)

      if (entry.type === "Directory") {
        spinner.text = `Create path ${entryPath}`
        mkdirp(entryPath, () => {
          entry.resume()
        })
      } else if (entry.type === "File") {
        if (entry.path === "./package.json") {
          spinner.text = "Update file package.json"
          const chunks = []
          entry.on("end", () => {
            const templatePackageJson = JSON.parse(Buffer.concat(chunks).toString())

            writePackageJson(packageJsonPath, packageJsonContent, templatePackageJson)
          })
          entry.on("data", (data) => {
            chunks.push(data)
          })
        } else {
          spinner.text = `Create file ${entryPath}`
          entry.pipe(fs.createWriteStream(entryPath))
        }
      }
    })
    .on("end", () => {
      spinner.succeed("Wrote project files from template")

      fs.createWriteStream(path.join(CWD, ".gitignore")).end(gitIgnoreContent)
      fs.createWriteStream(path.join(CWD, "readme.md")).end(readmeContent)

      const gettingStartedCommand = "npm install && npm run dev"

      writeLn()
      writeLn(
        chalk.cyan(
          `Run ${chalk.yellow(gettingStartedCommand)} to start development mode.`
        )
      )

      let pasteText =
        "It's on your clipboard right now, so simply paste it into your console."

      const platform = process.platform
      if (platform === "darwin") {
        pasteText =
          "It's on your clipboard right now, so press Command-V in your console."
      } else if (platform === "win32") {
        pasteText = "It's on your clipboard right now, so press CTRL-V in your console."
      } else if (platform === "linux") {
        pasteText =
          "It's on your clipboard right now, so press CTRL-SHIFT-V in your console."
      }
      writeLn(chalk.cyan(pasteText))

      clipboardy.writeSync(gettingStartedCommand)
    })
}

main().catch((error) => writeLn(chalk.red(error.stack)))
