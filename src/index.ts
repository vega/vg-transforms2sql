import "@mapd/connector/dist/browser-connector";
import * as vega from "vega";
import embed from "vega-embed";
import { Transforms2SQL } from "./transforms2sql";
// import { defaultConfig } from "vega-lite/build/src/config";

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
  ogSpecContainer.innerHTML = "<h3>Original Specification Data</h3>";
  ogSpecContainer.appendChild(ogSpecCode);
  container.appendChild(ogSpecContainer);
}

function displayModifiedSpec(container: HTMLDivElement, spec: any) {
  const modifiedSpecContainer = <HTMLDivElement>document.createElement("div");
  const modifiedSpecCode = <HTMLElement>document.createElement("pre");
  modifiedSpecCode.classList.add("prettyprint");
  modifiedSpecCode.innerHTML = JSON.stringify(spec, null, 4);

  modifiedSpecContainer.innerHTML =
    "<h3>Modified Specification Data</h3>";
  modifiedSpecContainer.appendChild(modifiedSpecCode);
  container.appendChild(modifiedSpecContainer);
}

function displaySQL(container: HTMLDivElement, sql: string) {
  const sqlContainer = <HTMLDivElement>document.createElement("div");
  const sqlCode = <HTMLElement>document.createElement("pre");
  sqlCode.classList.add("prettyprint");
  sqlCode.innerHTML = sql;

  sqlContainer.innerHTML = "<h3>Transforms as SQL</h3>";
  sqlContainer.appendChild(sqlCode);
  container.appendChild(sqlContainer);
}

function embedVisualization(containerID: string, spec: any, sql: string) {
    session.then(s => {
      s.queryAsync(sql).then(values => {
        embed(
          containerID,
          spec,
          { defaultStyle: true }
        ).then(res => {
          const view = res.view
          view.change('source', vega.changeset().insert(values)).run();
        });
    });
  });
}

function loadDemo(specName: string): void {
  const containerName = specName + "-container"
  const container: HTMLDivElement = <HTMLDivElement>document.getElementById(containerName);
  getSpec(specName).then(spec => {
    const selects = ['flight_dayofmonth', 'flight_month']
    const [exSpec, sql] = Transforms2SQL.extractVGTransforms(spec, table, selects);

    displayOriginalSpec(container, spec.data);
    displayModifiedSpec(container, exSpec.data);
    displaySQL(container, sql);

    embedVisualization("#" + specName + "-viz", exSpec, sql)
  });
}

loadDemo("flights_heatmap");
