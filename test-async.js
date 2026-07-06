const deleteId = "123";
const executeDelete = async () => {
  if (!deleteId) return;
  console.log("deleting", deleteId);
};
const onCancel = () => {
  console.log("cancelled");
};
const onClick = () => {
  executeDelete();
  onCancel();
};
onClick();
