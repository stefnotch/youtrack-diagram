<template>
  <div>
    <div id="chart-container" v-if="showTree">
      <span class="large-text">No Agile Board Selected</span>
    </div>
    <gantt-diagram v-else :diagram-data="ganttDiagramData"></gantt-diagram>
  </div>
</template>

<style scoped>
@import "./../scripts/orgchart.css";
@import "./../scripts/orgchart-custom-styles.css";
.large-text {
  font-size: 1.2em;
  margin-left: 12px;
}
</style>

<script>
import OrgChart from "./../scripts/orgchart.js";
import GanttDiagram from "./GanttDiagram.vue";
import panzoom from "panzoom";
import { ipcRenderer } from "electron";
import htmlToImage from "html-to-image";

import {
  Youtrack,
  IssueImpl,
  IssuePaths,
  Agile,
  SprintPaths,
  SprintImpl
} from "youtrack-rest-client";
import {
  FullIssueImpl,
  FullSprintImpl,
  getIssueField
} from "./../scripts/FullSprint.js";

/**
 * @typedef {{name: string, className: string, issueId: string, sprintId: string, issueParentId: number, description: string, children: any[]}} IssueDatasource
 */

/**
 * @typedef {{name:string,items:{name:string,fromDate:Date,toDate:Date}[]}[]} GanttDiagramData
 */

export default {
  name: "app-diagram",
  components: {
    GanttDiagram
  },
  props: ["youtrack", "agileId", "diagramMode"],
  data() {
    return {
      /**@type {Agile} */
      agile: undefined,
      /**@type {any} */
      zoomableDiagram: null,
      showTree: true,
      /** @type {GanttDiagramData|null} */
      ganttDiagramData: null
    };
  },
  watch: {
    agileId: {
      handler: function(value, oldValue) {
        this.displayChart(value, this.diagramMode);
      }
    },
    diagramMode: {
      handler: function(value, oldValue) {
        this.displayChart(this.agileId, value);
      }
    }
  },
  mounted() {
    ipcRenderer.on("take-screenshot", this.takeScreenshot);
  },
  beforeDestroy() {
    ipcRenderer.removeListener("take-screenshot", this.takeScreenshot);
  },
  methods: {
    /**
     * @param {String} agileId
     * @param {"sprint"|"epic"|"gantt"} diagramMode
     */
    async displayChart(agileId, diagramMode) {
      if (agileId === null || agileId === undefined) return;
      /** @type {Youtrack} */
      let yt = this.youtrack;

      let agile = await yt.agiles.byId(agileId);
      this.agile = agile;

      // TODO: If we have more than the default number/limit of issue, we might need to increase the max? options?

      // Agile
      /** @type {IssueDatasource} */
      let datasource = {
        name: agile.name,
        className: "Agile",
        children: []
      };

      // Get the full sprints (aka sprint including the issues)
      let fullSprints = await Promise.all(
        agile.sprints.map(sprint =>
          this.getFullSprintById(yt, agile.id, sprint.id)
        )
      );

      if (this.zoomableDiagram) {
        this.zoomableDiagram.dispose();
        this.zoomableDiagram = null;
      }
      this.ganttDiagramData = null;

      // Sprint Tree (Orgchart)
      if (!diagramMode || diagramMode == "sprint") {
        let sprintDatasources = fullSprints.map(sprint => {
          return {
            name: sprint.name,
            className: "Sprint",
            children: this.getSprintIssueDatasources(sprint, true)
          };
        });

        datasource.children.push(...sprintDatasources);

        this.showTreeDiagram(datasource, this.youtrack, this.agileId);
      } else if (diagramMode == "epic") {
        /** @type {IssueDatasource[]} */
        let issueDatasources = [];
        fullSprints.forEach(sprint =>
          issueDatasources.push(
            ...this.getIssuesDatasources(sprint.id, sprint.issues)
          )
        );

        issueDatasources = this.issueDatasourcesToTree(issueDatasources);
        datasource.children.push(...issueDatasources);

        this.showTreeDiagram(datasource, this.youtrack, this.agileId);
      } else if (diagramMode == "gantt") {
        this.ganttDiagramData = fullSprints
          .filter(sprint => sprint.start && sprint.finish)
          .map(sprint => {
            let items = sprint.issues
              .filter(issue => !issue.isDraft)
              .filter(issue => {
                return getIssueField(issue, "Type")
                  .toLowerCase()
                  .replace(/[^a-z]/g, "")
                  .includes("userstory");
              })
              .map(issue => {
                return {
                  name: issue.summary
                };
              });

            return {
              name: sprint.name,
              fromDate: new Date(sprint.start),
              toDate: new Date(sprint.finish),
              items: items
            };
          });
        this.showTree = false;
      }
    },

    /**
     * @param {IssueDatasource} datasource
     * @param {Youtrack} yt
     * @param {string} agileId
     */
    showTreeDiagram(datasource, yt, agileId) {
      this.showTree = true;
      let baseUrl = yt.baseUrl.replace(/\/api$/i, "");

      this.$nextTick(() => {
        let chartContainer = (document.querySelector(
          "#chart-container"
        ).innerHTML = "");
        let orgchart = new OrgChart({
          chartContainer: "#chart-container",
          data: datasource,
          /*nodeContent: "title",*/
          verticalDepth: 3,
          depth: 5,
          //pan: true,
          //zoom: true,
          /**
           * @param {HTMLElement} node
           */
          createNode: function(node, data) {
            // https://github.com/dabeng/OrgChart/blob/master/demo/option-createNode.html
            if (data.description) {
              node.setAttribute("title", data.description);
            }

            if (data.sprintId && data.issueId) {
              let url = `${baseUrl}/agiles/${agileId}/${data.sprintId}?issue=${data.issueId}`;

              let linkElement = document.createElement("a");
              linkElement.target = "_blank";
              linkElement.href = url;
              linkElement.className = "link";
              node.appendChild(linkElement);
            }
          }
        });

        // And make it properly pan & zoomable
        this.zoomableDiagram = panzoom(orgchart.chart);
      });
    },

    /**
     * @param {FullSprintImpl} sprint
     * @param {boolean} tree Should the issues be in a tree-form
     */
    getSprintIssueDatasources(sprint, tree) {
      let issueDatasources = this.getIssuesDatasources(
        sprint.id,
        sprint.issues
      );
      if (tree) {
        issueDatasources = this.issueDatasourcesToTree(issueDatasources);
      }
      return issueDatasources;
    },

    /**
     * @param {FullIssueImpl[]} issues
     * @param {boolean} tree Should the issues be in a tree-form
     */
    getIssuesDatasources(sprintId, issues) {
      // You got issues...
      let issueDatasources = issues
        .filter(issue => !issue.isDraft) // Remove the drafts
        .map(issue => {
          let issueState = getIssueField(issue, "State").replace(/\s/g, "");
          let issueType = getIssueField(issue, "Type").replace(/\s/g, "");

          // Too bad JS doesn't have a safe navigation operator yet
          let issueParentId = issue.parent.issues
            ? issue.parent.issues[0]
            : undefined;
          issueParentId = issueParentId ? issueParentId.id : undefined;

          // Create the datasource for this issue
          /** @type {IssueDatasource} */
          let issueDatasource = {
            name: issue.summary,
            className: `${issueState} ${issueType}`,
            issueId: issue.id,
            sprintId: sprintId,
            issueParentId: issueParentId,
            description: issue.description,
            children: []
          };
          return issueDatasource;
        });

      return issueDatasources;
    },

    /**
     * @param {IssueDatasource[]} issueDatasources
     */
    issueDatasourcesToTree(issueDatasources) {
      /**@type {Map<string, any>}*/
      let issueMap = new Map();
      issueDatasources.forEach(issueDs =>
        issueMap.set(issueDs.issueId, issueDs)
      );

      // Do the tree thingy
      issueDatasources = issueDatasources.filter(issueDs => {
        let parentDs = issueMap.get(issueDs.issueParentId);
        if (parentDs) {
          // Append this issue to the parent's children
          parentDs.children.push(issueDs);
          return false;
        }
        // Keep this issue around
        return true;
      });

      return issueDatasources;
    },

    /**
     * @param {Youtrack} yt
     * @param {string} agileId
     * @param {string} sprintId
     * @returns {Promise<FullSprintImpl>}
     */
    getFullSprintById(yt, agileId, sprintId) {
      return yt.sprints.getResourceWithFields(
        yt.sprints.format(SprintPaths.sprint, { agileId, sprintId }),
        FullSprintImpl
      );
    },

    takeScreenshot() {
      console.log("Taking a screenshot");
      if (this.showTree) {
        // Save image, rather slow
        htmlToImage
          .toBlob(document.querySelector("#chart-container"))
          .then(pngBlob => {
            let reader = new FileReader();
            reader.onload = () => {
              if (reader.readyState != 2) return;
              ipcRenderer.send("save-screenshot", {
                name: "screenshot",
                extension: "png",
                data: Buffer.from(reader.result)
              });
            };
            reader.readAsArrayBuffer(pngBlob);
          });
      } else {
        // Save svg
      }
    }
  }
};
</script>
