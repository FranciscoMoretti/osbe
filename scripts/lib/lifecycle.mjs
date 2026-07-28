import { createHash } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"

export function bumpVersion(version, releaseType) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!match) {
    throw new Error(`Expected a semantic version, received: ${version}`)
  }

  const [, majorValue, minorValue, patchValue] = match
  const major = Number(majorValue)
  const minor = Number(minorValue)
  const patch = Number(patchValue)

  if (releaseType === "major") return `${major + 1}.0.0`
  if (releaseType === "minor") return `${major}.${minor + 1}.0`
  if (releaseType === "patch") return `${major}.${minor}.${patch + 1}`

  throw new Error("Release type must be patch, minor, or major")
}

export async function updatePackageVersion(packagePath, releaseType) {
  const original = await readFile(packagePath, "utf8")
  const packageJson = JSON.parse(original)
  const nextVersion = bumpVersion(packageJson.version, releaseType)

  packageJson.version = nextVersion
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`)

  return {
    nextVersion,
    original,
    restore: () => writeFile(packagePath, original)
  }
}

export async function sha256File(file) {
  const contents = await readFile(file)
  return createHash("sha256").update(contents).digest("hex")
}
