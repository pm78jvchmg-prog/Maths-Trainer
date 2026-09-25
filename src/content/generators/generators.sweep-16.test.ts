// One slice of the generic generator sweep. The shard number is read from this
// file's name; see ./sweep/generatorSweep.ts.
import { sweepShard } from './sweep/generatorSweep';

sweepShard(import.meta.url);
