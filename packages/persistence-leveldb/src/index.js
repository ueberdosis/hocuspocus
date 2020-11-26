export class PersistenceLevelDB {
  configuration = {
    path: './database',
  }

  constructor(configuration) {
    this.configuration = {
      ...this.configuration,
      ...configuration
    }

    console.log('LevelDB persistence configuration: ', this.configuration)

    return this
  }
}
