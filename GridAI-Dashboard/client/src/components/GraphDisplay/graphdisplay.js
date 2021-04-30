import { Grid } from "@material-ui/core";
import React, { Component } from "react";
import { Graph } from "react-d3-graph";
import LineChart from "../Charts/linechart.js";

//Configs for graph and linechart
const graphstyle = {
  height: "600px",
  width: "1000px",
};

const chartstyle = {
  position: "absolute",
  top: "80px",
  right: "0",
};

const myConfig = {
  height: 600,
  width: 1000,
  staticGraph: true,
  staticGraphWithDragAndDrop: false,
  nodeHighlightBehavior: true,
  node: {
    color: "lightgreen",
    size: 120,
    highlightStrokeColor: "blue",
    labelPosition: "top",
  },
  link: {
    highlightColor: "lightblue",
  },
};

//Displays the source/target nodes between a link. Doesn't do anything
const onClickLink = function (source, target) {
  window.alert(`Clicked link between ${source} and ${target}`);
};


class GraphDisplay extends Component {

  /*State variables:
  lineData: Holds 24hour history data of selected Bus
  nodeCoords: Coordinates of every bus node in the database
  multiCheckbox: boolean enables/disables compare function of 2 node's history data
  simCheck: Toggle realtime(1hr)/10second simulation of bus data
  isLoaded: True when node coordinates are fetched succesfully, allows rendering
  */
  constructor(props) {
    super(props);
    this.state = {
      lineData: [],
      nodeCoords: [],
      multiCheckbox: false,
      simCheck:false,
      isLoaded: false,
    };

    this.onClickNode = this.onClickNode.bind(this);
  }

  //Initially populate the graph with nodes using the fetched coordinates
  componentDidMount() {
    this.fetchNodeCoords();
  }

  //Fetches node coordinates from api and sets isLoaded to True to start rendering. 
  fetchNodeCoords = () => {
    fetch("/coordinates")
      .then((res1) => res1.json())
      .then((data1) =>
        this.setState({
          nodeCoords: data1,
          isLoaded: true,
        })
      );
  };

  //Get current value of selected node
  fetchValue = async (node) => {
    const resp = await fetch(`/allCurrentValues/${node}`);
    const data = await resp.json();
    return data;
  };

  //Get 24hours of past data for the selected node
  fetchHistory = async (node) => {
    let str = node.split("_");
    const resp = await fetch(`/history/${str[1]}`);
    const data = await resp.json();
    return data;
  };

  //Fetches all predictions and filters out the selected node's predicted value for the next hour
  fetchPredictions = async (node) => {
    const resp = await fetch(`/allPred`);
    const data = await resp.json();
    for (let i = 0; i < data["predictions"].length; i++) {
      let temp = data["predictions"][i].split(":");
      if (node === temp[0]) {
        return data["predictions"][i];
      }
    }
  };

  //When a node is clicked on the graph, shows current value and linechart with data history
  onClickNode = async (nodeID) => {
    const val = await this.fetchValue(nodeID);
    if (val[0] == null) {
      window.alert("No value for this node!");
      return;
    }
    window.alert(`Current Value: ${val[0].currentValue}`);

    const hist = await this.fetchHistory(nodeID);
    const pred = await this.fetchPredictions(nodeID);
    if (this.state.multiCheckbox) {
      this.getCompareData(nodeID, hist, pred);
    } else {
      this.getLineData(nodeID, hist, pred);
    }
  };

  //Uses fetched history and predicted data of a node and formats for use in Line Chart
  getLineData = async (nodeID, hist, pred) => {

    //First array stores Chart axis labels: Time and Name of Bus
    let temparr = [["time", nodeID]];
    let tempdata = [];

    //after splitting each result, index 1 stores time and index 2 stores kWh value 
    for (let i = 0; i < hist["result"].length; i++) {
      let temp = hist["result"][i].split(" ");
      tempdata = [String(temp[1]), Number(temp[2])];
      temparr.push(tempdata);
    }

    //same job as previous loop, but time is labelled "Predicted", value is the predicted kWh for the next hour reading.
    //Once temparr is setup, lineData is updated, curent state is updated, causing rerender.
    if(pred!=null){
    let predVal = pred.split(":");
    let temp = ["predicted", Number(predVal[1])];
    temparr.push(temp);
    console.log(temparr[0][1]);
    }
    this.setState({ lineData: temparr });
  };

  //Same as the above function, just adds the formatted data to the next index to allow comparision in linechart.
  getCompareData = async (nodeID, hist, pred) => {
    var { lineData } = this.state;

    //incase user hasn't first clicked on a node already, don't allow comparision
    if(lineData[0]==null){
      window.alert("Please select a primary node before comparision!");
      return;
    }

    let temparr = [["time", lineData[0][1], nodeID]];
    let tempdata = [];
    for (let i = 0; i < hist["result"].length; i++) {
      let temp = hist["result"][i].split(" ");
      tempdata = [String(temp[1]), lineData[i + 1][1], Number(temp[2])];
      temparr.push(tempdata);
    }

    if(pred!=null){
    let predVal = pred.split(":");
    let temp = [
      "predicted",
      lineData[lineData.length - 1][1],
      Number(predVal[1]),
    ];
    temparr.push(temp);
    }
    this.setState({ lineData: temparr });
  };


  //Set the multiCheckbox value:on checked/unchecked
  onChangeMulti = (e) => {
    this.setState({ multiCheckbox: e.target.checked });
  };

  //Set the simCheck value and call updateSim() to trigger the simulation speed in backend
  onChangeSim = (e) =>{
    this.setState({simCheck: e.target.checked})
    this.updateSim();
  };

  //this api call changes sim speed in backend.
  updateSim = async() =>{
    const resp = await fetch(`/sim`);
    return;
  };

  render() {
    if (!this.state.isLoaded) {
      return <div>Loading...</div>;
    } 
    
    else {
      //initiate state variables now that they are loaded.
      var { nodeCoords, lineData, multiCheckbox, simCheck } = this.state;

      //Coordinates formatted for graph. Adjust the X/Y coords for easier visibility(Otherwise too close together)
      let coords = [];
      for (let i = 0; i < nodeCoords.length; i++) {
        coords.push({
          id: nodeCoords[i].BusID,
          x: nodeCoords[i].X * 50 + 100,
          y: nodeCoords[i].Y * -50 + 750,
        });
      }

      // let link = [];
      // for(let i=0;i<alldata[1].length;i++){
      //   link.push({source: "bus"+String(alldata[1][i].n.BusA), target:"bus"+String(alldata[1][i].n.BusB)})
      // }
      // for(let i=0;i<alldata[2].length;i++){
      //   link.push({source: "bus"+String(alldata[2][i].n.BusA), target:"bus"+String(alldata[2][i].n.BusB)})
      // }
      // for(let i=0;i<alldata[3].length;i++){
      //   link.push({source: "bus"+String(alldata[3][i].n.BusA), target:"bus"+String(alldata[3][i].n.BusB)})
      // }

      return (
        <div>
          <div style={chartstyle}>
            {
              (console.log("this is linedata"),
              console.log(lineData),
              (<LineChart data={lineData} />))
            }
          </div>
          <Grid container spacing={3}>
            <Grid item xs={6} sm={3}>
              <div style={graphstyle}>
                {

                  //Graph component:
                  <Graph
                    id="graph-id" // id is mandatory
                    data={{ nodes: coords, links: [] }}
                    config={myConfig}
                    onClickNode={this.onClickNode}
                    onClickLink={onClickLink}
                  />
                }
              </div>
            </Grid>
          </Grid>
          <form>
            <h3>Graph Settings</h3>
            <label>
              Compare nodes?
              <input
                type="checkbox"
                checked={multiCheckbox}
                onChange={this.onChangeMulti}
              />
            </label>
            <br></br>
            <label>
              Switch Simulation Speed(10sec/1hr):
              <input 
                type="checkbox"
                checked = {simCheck}
                onChange = {this.onChangeSim}
              />
            </label>
          </form>
        </div>
      );
    }
  }
}

export default GraphDisplay;
