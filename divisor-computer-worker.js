import {chooseComputerMove} from './divisor-computer.js?v=0.14.0-release-2';
self.onmessage = ({data}) => {
  try {self.postMessage({result:chooseComputerMove(data.state,data.difficulty)});}
  catch {self.postMessage({error:true});}
};
