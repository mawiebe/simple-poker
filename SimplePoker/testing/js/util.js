function expect(condition, err, errors, extraData) {
  if (!condition) {
    errors.push(err + (extraData ? JSON.stringify(extraData) : ""));
  }
}

function outputTest(errors, name) {
  if (errors.length > 0) {
    document.write("<span style='color:red'>✗</span> " + name +
    " Errors: <br>");
    for (var i in errors) {
      document.write(errors[i] + "<br/>");
    }
  } else {
    document.write("<span style='color:green'>✔</span> " + name +
      " successful<br>");
  }
}
