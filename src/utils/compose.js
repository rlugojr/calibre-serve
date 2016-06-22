module.exports = function compose(...fns){
	const length = fns.length;
	return function processRow(row,index){
		let i = 0;
		while(i < length){
			const fn = fns[i++];
			row = fn(row,index);
		}
		return row;
	}
}