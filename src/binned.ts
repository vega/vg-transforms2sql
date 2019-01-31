import { getSpec } from "./demo";
import embed from "vega-embed";
import { Transforms2SQL } from "./transforms2sql";
import * as vega from "vega";

const vizDiv = "#binned-viz";
const spec = "flights_histogram";
const table = "flights_donotmodify";

// connect to MapD server; start session
const connection = new (window as any).MapdCon()
  .protocol("https")
  .host("metis.mapd.com")
  .port("443")
  .dbName("mapd")
  .user("mapd")
  .password("HyperInteractive");
const session = connection.connectAsync();

getSpec(spec).then(spec => {
    // Grab the three transforms from our spec
    const extentTransform = spec.data[1].transform[0];
    const binTransform    = spec.data[1].transform[1];
    const aggTransform    = spec.data[1].transform[2];

    // Delete extent transform from spec (else get duplicate signal error)
     delete spec.data[1].transform[0];

    // Get and execute query to get field extent
    const extentSQL = Transforms2SQL.extentQuery(table, extentTransform);
    session.then(s => {
        s.queryAsync(extentSQL).then(extent => {
            const min = extent[0].fmin;
            const max = extent[0].fmax;
            // Manually insert extent signal
            spec["signals"] = [{name: extentTransform.signal, value: [min, max]}]

            // Embed visualization
            embed(vizDiv, spec, { defaultStyle: true }).then(res => {
                // Use min and max as input to extent signal
                const view = res.view;
                // Get binning information
                const binFunc = view.signal(binTransform.signal);
                const binSQL = Transforms2SQL.binQuery(table, binTransform.field, binFunc, binTransform);

                const components = {
                    table: `(${binSQL})`,
                    select: new Set(["bin_maxbins_15_deptime", "bin_maxbins_15_deptime_end"]),
                    group: new Set(),
                    where: [] 
                };
                Transforms2SQL.addAggregateToComps(components, aggTransform);
                const composedQuery = Transforms2SQL.componentsToQuery(components);
                console.log(composedQuery);
                s.queryAsync(composedQuery).then(res => {
                    view.change('data_1', vega.changeset().insert(res)).run();
                })
            });
        })
    });
});
