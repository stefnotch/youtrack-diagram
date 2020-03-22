<template>
  <div class="diagram-container" ref="diagram">
    <svg
      class="diagram"
      :width="width"
      :height="height"
      font-size="14"
      font-family="'Roboto','Helvetica Neue','Helvetica','Arial',sans-serif"
    >
      <g class="diagram-header">
        <g>
          <g v-for="(month, index) in months" :key="index">
            <line
              v-if="index != 0"
              :x1="month.x * xScale"
              :y1="0"
              :x2="month.x * xScale"
              :y2="height"
              stroke="lightgrey"
              stroke-width="2"
            />
            <text
              :x="month.x * xScale + xScale/4"
              :y="yScale/2"
              dominant-baseline="middle"
            >{{month.name}}</text>
          </g>
        </g>
        <!-- <line :x1="0" :y1="yScale" :x2="width" :y2="yScale " stroke="lightgrey" /> -->

        <!-- <line :x1="0" :y1="yScale * 2" :x2="width" :y2="yScale * 2" stroke="lightgrey" />-->
        <g>
          <g v-for="(day, index) in days" :key="index">
            <line
              v-if="index != 0"
              :x1="day.x * xScale"
              :y1="yScale"
              :x2="day.x * xScale"
              :y2="height"
              stroke="lightgrey"
            />
            <text
              :x="day.x * xScale + xScale/2"
              :y="yScale + yScale/2"
              dominant-baseline="middle"
              text-anchor="middle"
            >{{day.name}}</text>
          </g>
        </g>
      </g>
      <g :transform="`translate(0,${xScale * 2.5})`">
        <g v-for="(milestone, milestoneIndex) in milestones" :key="milestoneIndex">
          <line
            :x1="milestone.to * xScale + xScale / 2"
            :y1="milestone.itemsIndex * yScale + yScale / 2"
            :x2="milestone.to * xScale + xScale / 2"
            :y2="(milestone.itemsIndex + milestone.items.length) * yScale + yScale / 2"
            stroke="#2196f3"
            stroke-width="3"
            stroke-linecap="square"
          />

          <path
            :d="`M ${milestone.to * xScale + xScale / 2} ${(milestone.itemsIndex + milestone.items.length) * yScale + yScale / 2 - 2} l-7 7 7 7 l7 -7 Z`"
            fill="black"
          />
          <text
            :x="milestone.to * xScale + xScale"
            :y="(milestone.itemsIndex + milestone.items.length) * yScale + yScale / 2 + 7"
            dominant-baseline="middle"
            fill="black"
          >{{milestone.name}}</text>

          <g v-for="(item, itemIndex) in milestone.items" :key="itemIndex">
            <rect
              :width="(milestone.to - milestone.from) * xScale"
              :height="yScale - 4"
              :x="milestone.from * xScale"
              :y="(milestone.itemsIndex + itemIndex) * yScale + 2"
              fill="#2196f3"
              rx="3"
              ry="3"
            />
            <line
              :x1="milestone.to * xScale"
              :y1="(milestone.itemsIndex + itemIndex) * yScale + yScale / 2"
              :x2="milestone.to * xScale + xScale / 2"
              :y2="(milestone.itemsIndex + itemIndex) * yScale + yScale / 2"
              stroke="#2196f3"
              stroke-width="3"
            />
            <text
              :x="milestone.from * xScale + 5"
              :y="(milestone.itemsIndex + itemIndex) * yScale + yScale / 2"
              dominant-baseline="middle"
              fill="white"
            >{{item.name}}</text>
          </g>
        </g>
      </g>
    </svg>
  </div>
</template>
<style scoped>
.diagram-container {
  padding: 1em;
}
</style>
<script>
import panzoom from "panzoom";

/**
 * @typedef {{name:string,fromDate:Date,toDate:Date,items:{name:string}[]}[]} GanttDiagramData
 */

/**
 * @typedef {{name:string,from:number,to:number,itemsIndex:number,items:{name:string}[]}[]} Milestones
 */

export default {
  props: {
    /** @type {import('vue').PropOptions<GanttDiagramData>} */
    diagramData: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      zoomableDiagram: null,
      xScale: 28,
      yScale: 30
    };
  },
  computed: {
    /** @returns {Date} */
    startDate() {
      return this.diagramData
        .map(d => d.fromDate)
        .reduce((a, b) => (a.getTime() < b.getTime() ? a : b));
    },
    /** @returns {Date} */
    endDate() {
      // 8 days of padding after the end
      let endDate = this.diagramData
        .map(d => d.toDate)
        .reduce((a, b) => (a.getTime() > b.getTime() ? a : b));
      endDate = new Date(endDate.getTime());
      endDate.setDate(endDate.getDate() + 8);
      return endDate;
    },
    /** @returns {{name:string, x:number}[]} */
    months() {
      let startXPosition = this.toXPosition(this.startDate);
      let endDate = new Date(this.endDate.getTime());
      endDate.setDate(endDate.getDate() + 1);
      let currentDate = new Date(this.startDate.getTime());
      let months = [];
      let lastMonth = null;
      while (currentDate.getTime() <= endDate.getTime()) {
        if (currentDate.getMonth() != lastMonth) {
          let monthName = currentDate.toLocaleString("en-US", {
            month: "long"
          });
          months.push({
            name: `${monthName} ${currentDate.getFullYear()}`,
            x: this.toXPosition(currentDate) - startXPosition
          });
          lastMonth = currentDate.getMonth();
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return months;
    },
    /** @returns {{name:string, x:number}[]} */
    days() {
      let startXPosition = this.toXPosition(this.startDate);
      let endDate = new Date(this.endDate.getTime());
      endDate.setDate(endDate.getDate() + 1);
      let currentDate = new Date(this.startDate.getTime());
      let days = [];
      while (currentDate.getTime() <= endDate.getTime()) {
        days.push({
          name: `${currentDate.getDate()}`,
          x: this.toXPosition(currentDate) - startXPosition
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return days;
    },
    /** @returns {number} */
    numberOfItems() {
      // + 1 because every milestone also gets displayed on its own row
      return this.diagramData
        .map(d => d.items.length + 1)
        .reduce((a, b) => a + b);
    },
    /** @returns {number} */
    width() {
      return (
        this.xScale *
        (this.toXPosition(this.endDate) - this.toXPosition(this.startDate))
      );
    },
    /** @returns {number} */
    height() {
      // + 3 because of the header row
      return this.yScale * (this.numberOfItems + 3);
    },
    /** @returns {Milestones[]} */
    milestones() {
      console.log(this.startDate);
      let startXPosition = this.toXPosition(this.startDate);
      let counter = 0;
      return this.diagramData.map(d => {
        let index = counter;
        // + 1 because every milestone also gets displayed on its own row
        counter += d.items.length + 1;
        return {
          name: d.name,
          from: this.toXPosition(d.fromDate) - startXPosition,
          to: this.toXPosition(d.toDate) - startXPosition,
          itemsIndex: index,
          items: d.items.map(e => {
            return { name: e.name };
          })
        };
      });
    }
  },
  mounted() {
    this.zoomableDiagram = panzoom(this.$refs["diagram"], {
      filterKey: () => true
    });
  },
  beforeDestroy() {
    if (this.zoomableDiagram) {
      this.zoomableDiagram.dispose();
      this.zoomableDiagram = null;
    }
  },
  methods: {
    /**
     * @param {Date} date
     */
    toXPosition(date) {
      return Math.floor(date.getTime() / 1000) / (60 * 60 * 24);
    }
  }
};
</script>