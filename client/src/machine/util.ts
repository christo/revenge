const plural = (remainingBytes: number, maybeAddS: string) => {
  return remainingBytes > 1 ? maybeAddS + 's' : maybeAddS;
};

export {plural};