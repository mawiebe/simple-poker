let I=`grep -o 'cbust=[0-9]*' public/index.html | head -n 1 | sed 's/cbust=//g'`;
let J=I+1;

sed -i "s/cbust=$I/cbust=$J/g" public/index.html

firebase deploy

