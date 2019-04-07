<template>
  <div>
    <div id="chart-container">No Agile Board Selected</div>
  </div>
</template>

<style scoped>
@import "./../scripts/orgchart.css";
@import "./../scripts/orgchart-custom-styles.css";
</style>

<script>
import OrgChart from "./../scripts/orgchart.js";

//import OrganizationChart from "vue-organization-chart";
//import "vue-organization-chart/dist/orgchart.css";
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

function showChart(datasource) {
  document.querySelector("#chart-container").innerHTML = "";
  let orgchart = new OrgChart({
    chartContainer: "#chart-container",
    data: datasource,
    /*nodeContent: "title",*/
    verticalDepth: 3,
    depth: 5,
    pan: true,
    zoom: true,
    /**
     * @param {HTMLElement} node
     */
    createNode: function(node, data) {
      // https://github.com/dabeng/OrgChart/blob/master/demo/option-createNode.html
      if (data.description) {
        node;
        node.setAttribute("title", data.description);
      }
    }
  });
}

/**
 * @param {Youtrack} yt
 * @param {string} agileId
 * @param {string} sprintId
 * @returns {Promise<FullSprintImpl>}
 */
function getFullSprintById(yt, agileId, sprintId) {
  return yt.sprints.getResourceWithFields(
    yt.sprints.format(SprintPaths.sprint, { agileId, sprintId }),
    FullSprintImpl
  );
}

export default {
  name: "app-diagram",
  components: {},
  props: ["youtrack", "agileId"],
  data() {
    return {
      /**@type {Agile} */
      agile: undefined
    };
  },
  watch: {
    agileId: {
      handler: function(value, oldValue) {
        this.displayChart(value);
      }
    }
  },
  methods: {
    /**
     * @param {String} agileId
     */
    async displayChart(agileId) {
      /** @type {Youtrack} */
      let yt = this.youtrack;

      let agile = await yt.agiles.byId(agileId);
      this.agile = agile;

      // TODO: If we have more than the default number/limit of issue, we might need to increase the max? options?

      // Agile
      let datasource = {
        name: agile.name,
        className: "Agile",
        children: []
      };

      // Get the full sprints (aka sprint including the issues)
      let fullSprints = await Promise.all(
        agile.sprints.map(sprint => getFullSprintById(yt, agile.id, sprint.id))
      );

      // Sprint Tree (Orgchart)
      let sprintDatasources = fullSprints.map(sprint => {
        return {
          name: sprint.name,
          className: "Sprint",
          children: this.getSprintIssueDatasources(sprint)
        };
      });

      datasource.children.push(...sprintDatasources);

      console.log(datasource);

      showChart(datasource);
    },

    /**
     * @param {FullSprintImpl} sprint
     * @param {boolean} tree Should the issues be in a tree-form
     */
    getSprintIssueDatasources(sprint, tree = true) {
      /**@type {Map<string, any>}*/
      let issueMap = new Map();

      // You got issues...
      let issueDatasources = sprint.issues.map(issue => {
        let issueState = getIssueField(issue, "State").replace(/\s/g, "");
        let issueType = getIssueField(issue, "Type").replace(/\s/g, "");

        // Too bad JS doesn't have a safe navigation operator yet
        let issueParentId = issue.parent.issues
          ? issue.parent.issues[0]
          : undefined;
        issueParentId = issueParentId ? issueParentId.id : undefined;

        // Create the datasource for this issue
        let issueDatasource = {
          name: issue.summary,
          className: `${issueState} ${issueType}`,
          issueId: issue.id,
          issueParentId: issueParentId,
          description: issue.description,
          children: []
        };

        issueMap.set(issue.id, issueDatasource);

        return issueDatasource;
      });

      if (tree) {
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
      }

      return issueDatasources;
    }
  }
};
</script>
