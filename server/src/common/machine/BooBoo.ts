/**
 * Error class for user-reportable problems, all the sensible names have been domain squatted by typescript/javascript.
 */
class BooBoo {
  readonly mesg: string;

  constructor(mesg: string) {
    this.mesg = mesg;
  }
}

export {BooBoo};