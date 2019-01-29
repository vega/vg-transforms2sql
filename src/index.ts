import "@mapd/connector/dist/browser-connector";
import embed from "vega-embed";
// import { defaultConfig } from "vega-lite/build/src/config";
// import { Transforms2SQL } from "./transforms2sql";

// connect to MapD server; start session
const connection = new (window as any).MapdCon()
  .protocol("https")
  .host("metis.mapd.com")
  .port("443")
  .dbName("mapd")
  .user("mapd")
  .password("HyperInteractive");

const session = connection.connectAsync();

const table = "flights_donotmodify";

async function getSpec(name: string) {
  const specPath = `specs/${name}.vg.json`
  return fetch(specPath)
    .then(res => res.json())
}

function displayOriginalSpec(container: HTMLDivElement, spec: any) {
  // Insert original vega spec
  const ogSpecContainer = <HTMLDivElement>document.createElement("div");
  const ogSpecCode = <HTMLElement>document.createElement("pre");
  ogSpecCode.classList.add("prettyprint");
  ogSpecCode.innerHTML = JSON.stringify(spec, null, 4);
  ogSpecContainer.innerHTML = "<h3>Original Specification</h3>";
  ogSpecContainer.appendChild(ogSpecCode);
  container.appendChild(ogSpecContainer);
}
function embedVisualization(containerID: string, spec: any) {
  console.log(containerID);
  embed(
    containerID,
    spec,
    { defaultStyle: true }
  ).then(view => {
    console.log(view)
  });
}
function loadDemo(specName: string): void {
  const containerName = specName + "-container"
  const container: HTMLDivElement = <HTMLDivElement>document.getElementById(containerName);
  getSpec(specName).then(spec => {
    displayOriginalSpec(container, spec)
    embedVisualization("#" + specName + "-viz", spec)
    // Insert visualization
    /*
    session.then(s => {
      s.queryAsync(sql).then(values => {
        // load visualization
      });
    });
    */
  });
  /*

  // Insert modified vega spec
  const modifiedSpec = extractTransforms(spec, defaultConfig);

  const modifiedSpecContainer = <HTMLDivElement>document.createElement("div");
  const modifiedSpecCode = <HTMLElement>document.createElement("pre");
  modifiedSpecCode.classList.add("prettyprint");
  modifiedSpecCode.innerHTML = JSON.stringify(modifiedSpec, null, 4);

  modifiedSpecContainer.innerHTML =
    "<h3>Specification w/ Extracted Transforms</h3>";
  modifiedSpecContainer.appendChild(modifiedSpecCode);
  container.appendChild(modifiedSpecContainer);

  // Insert transformation SQL
  const transforms = modifiedSpec.transform;
  const selects = selectedFields(spec);
  selects.splice(selects.length - 1, 1);
  delete modifiedSpec.transform;
  const sql = Transforms2SQL.convert(table, selects, transforms);

  const sqlContainer = <HTMLDivElement>document.createElement("div");
  const sqlCode = <HTMLElement>document.createElement("pre");
  sqlCode.classList.add("prettyprint");
  sqlCode.innerHTML = sql;

  sqlContainer.innerHTML = "<h3>Transforms as SQL</h3>";
  sqlContainer.appendChild(sqlCode);
  container.appendChild(sqlContainer);

  // Insert visualization
  session.then(s => {
    s.queryAsync(sql).then(values => {
      // load visualization
      embed(
        "#" + containerName + "-viz",
        Object.assign({ data: { values } }, modifiedSpec),
        { defaultStyle: true }
      );
    });
  });
  */
}

// loadDemo("barchart", vlBarchart);
loadDemo("flights_heatmap");
