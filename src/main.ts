// todo
document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("myButton") as HTMLButtonElement;

  //button click alert
  if (button) {
    button.addEventListener("click", () => {
      alert("you clicked the button!");
      console.log("you clicked the button!");
    });
  }
});
