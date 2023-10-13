// https://www.udemy.com/course/nodejs-the-complete-guide/learn/lecture/12198026#questions/20668910
document
  .getElementById("deleteButton")
  .addEventListener("click", function (event) {
    const btn = event.target; // Get the button that was clicked
    const prodId = btn.parentNode.querySelector("[name=productId]").value;
    const csrf = btn.parentNode.querySelector("[name=_csrf]").value;

    const productElement = btn.closest("article");

    fetch("/admin/product/" + prodId, {
      method: "DELETE",
      headers: {
        "csrf-token": csrf,
      },
    })
      .then((result) => {
        return result.json();
      })
      .then((data) => {
        console.log(data);
        // productElement.remove(); not supported in Internet Explorer
        productElement.parentNode.removeChild(productElement);
      })
      .catch((err) => {
        console.log(err);
      });
  });
