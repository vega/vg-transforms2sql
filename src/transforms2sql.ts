import clone from "clone";
import { setPriority } from "os";
import { NON_TYPE_DOMAIN_RANGE_VEGA_SCALE_PROPERTIES } from "vega-lite/build/src/scale";

export class Transforms2SQL {
  /**
   * Extract transforms from VG spec. Return spec without transforms
   * and transforms as SQL.
   */

  public static extractVGTransforms(spec: any, table: string, selections: string[]){
    let transforms = spec.data[1].transform;
    let extractSpec = clone(spec);
    let sqlTransforms = this.convert(table, selections, transforms)
    delete extractSpec.data[1].transform;
    return [extractSpec, sqlTransforms]
  }

  public static addAggregateToComps(components: any, aggregate: any) {
    const zipped = this.zip(aggregate.ops, aggregate.fields, aggregate.as);
    for(const pair of zipped) {
      let [op, field, as] = pair
      switch(op) {
        case 'average':
          op = 'avg'
        case 'max': 
        case 'min':
        case 'count':
          components.select.add(`${op}(${field}) AS ${as}`)
          for(const group of aggregate.groupby){
            components.group.add(group);
          }
          break;
        default:
          console.warn(`Unsupported aggregate operation: '${op}'`)
      }
    }
  }

  // TODO: Doesn't handle null records correctly, puts them in max bin
  public static binQuery(table: string, field: string, bins: any, transform: any) {
    const [binField, binEndField] = transform.as;
    const ranges = [];
    for(let begin = bins.start; begin < bins.stop; begin += bins.step) {
      ranges.push([begin, begin + bins.step]);
    }
    let cases = "";
    for(let i=0; i < ranges.length; i++) {
      let last = i == ranges.length - 1;
      const [start, stop] = ranges[i];
      if (!last) {
        cases += `CASE WHEN ${field} >= ${start} AND ${field} < ${stop} THEN ${start} ELSE (`
      } else {
        cases += start;
        cases += ") END".repeat(ranges.length - 1);
      }
    }

    return `
      SELECT ${binField}, ${binField} + ${bins.step} AS ${binEndField}
      FROM (
        SELECT *, ${cases} AS ${binField}
        FROM ${table}
      )
    `
  }

  public static extentQuery(table: string, transform: any) {
    return `
    SELECT MAX(${transform.field}) AS fmax, MIN(${transform.field}) AS fmin
    FROM ${table}
    `
  }

  private static zip(...arrs: any[]) {
    const out = [];
    for(let i=0; i < arrs[0].length; i++){
      const entry = []
      for(const arr of arrs) {
        entry.push(arr[i]);
      }
      out.push(entry);
    }
    return out;
  }

  public static convert(
    table: string,
    selections: string[],
    transforms: any
  ): string {
    let components = {
      table: table,
      select: new Set(Object.assign([], selections)),
      where: [],
      group: new Set()
    };
    for (const transform of transforms) {
      switch (transform.type) {
        case 'aggregate':
          this.addAggregateToComps(components, transform)
          break;
      }
    }
    for (const select of selections) {
      components.group.add(select);
    }
    return this.componentsToQuery(components);
  }

  public static componentsToQuery(components: any){
    return `SELECT ${Array.from(components.select).join(", ")} 
FROM ${components.table}${
        components.where.length > 0 ? "\nWHERE " : ""
      }${components.where.join(", ")}${
        components.group.size > 0 ? "\nGROUP BY " : ""
      }${Array.from(components.group).join(", ")}
    `;

  }
}
