export const sleep = (time: number) => {
  return new Promise(async resolve => {
    setTimeout(resolve, time)
  })
}
