import chalk from 'chalk';
import boxen from 'boxen';

const matrix = chalk.hex('#00ff41');

const BANNER = [
  '##    ## ######## ##    ##  ######  ########   #######  ########',
  '##   ##  ##        ##  ##  ##    ## ##     ## ##     ##    ##',
  '##  ##   ##         ####   ##       ##     ## ##     ##    ##',
  '#####    ######      ##     ######  ########  ##     ##    ##',
  '##  ##   ##          ##          ## ##        ##     ##    ##',
  '##   ##  ##          ##    ##    ## ##        ##     ##    ##',
  '##    ## ########    ##     ######  ##         #######     ##',
].join('\n');

export function showBanner(): void {
  const art = matrix(BANNER);
  const subtitle = `Runtime Security & Taint-Tracking Middleware for Autonomous AI Agents`;
  const installCmd = chalk.dim.hex('#00ff41')('$ npm install @roadsidelab/keyspot-sdk');

  const content = `${art}\n\n${subtitle}\n${installCmd}`;

  console.log(
    boxen(content, {
      padding: { top: 1, bottom: 1, left: 2, right: 2 },
      borderStyle: 'round',
      borderColor: '#00ff41',
    })
  );
}
