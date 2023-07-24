// app/helpers/format-date.ts
import { helper } from '@ember/component/helper';
const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
export function dateformat([date]: [string]): string {
    let res="",year="",month="",day="";
    let n=date.length;
    if (n===0) {
        return year;
    }
    for (let index = 0; index <=3; index++) {
        let element = date[index];
        year+=element;
    }
    for (let index = 5; index <=6; index++) {
        let element = date[index];
        month+=element;
    }
    for (let index = 8; index <=9; index++) {
        let element = date[index];
        day+=element;
    }
    res=`${monthNames[parseInt(month) - 1]} ${day}, ${year}`
    return res;
}

export default helper(dateformat);
