const habitList = document.querySelector('.todo-list');
const addHabitButton = document.querySelector('.todo__add');
addHabitButton.style.display = 'flex';
addHabitButton.style.alignItems = 'center';
addHabitButton.style.marginLeft = '15%';
addHabitButton.style.marginRight = '15%';
addHabitButton.style.marginTop = '0';
addHabitButton.style.paddingTop = '0';

// Array to store changes made to habit items
let habitChanges = [];

// Pop-up window for adding or deleting list-item
addHabitButton.addEventListener('click', () => {
  Swal.fire({
    title: 'Add a New Habit',
    text: `Please enter the name of the new habit ✍️`,
    input: 'text',
    inputAttributes: {
      autocapitalize: 'off'
    },
    showCancelButton: true,
    confirmButtonText: 'Add Habit',
    showLoaderOnConfirm: true,
    preConfirm: (habitName) => {
      if (habitName) {
        addHabitItem(habitName);
        habitChanges.push({ type: 'add', name: habitName });
        saveHabitsToFirestore();
        return habitName;
      }
    },
    allowOutsideClick: () => !Swal.isLoading()
  }).then((result) => {
    if (result.isConfirmed) {
      Swal.fire({
        title: 'Success!',
        text: `The habit '${result.value}' was added successfully.`,
        icon: 'success'
      });
    }
  });
});


function addHabitItem(name, id) {
  // Creates list items
  const habitItem = document.createElement('label');
  habitItem.classList.add('todo');
  habitItem.style.display = 'flex';
  habitItem.style.alignItems = 'center';
  habitItem.style.marginLeft = '15%';
  habitItem.style.marginRight = '15%';

  // Adds checkbox input
  const checkbox = document.createElement('input');
  checkbox.classList.add('todo__state');
  checkbox.type = 'checkbox';
  habitItem.appendChild(checkbox);

  // 'x' button to delete list items
  const deleteButton = document.createElement('button');
  deleteButton.classList.add('btn', 'btn-link', 'text-decoration-none', 'btn-delete');
  deleteButton.textContent = '×';
  deleteButton.style.fontSize = '35pt'
  deleteButton.style.color = '#93BFCF';
  deleteButton.style.fontWeight = 'bold';
  deleteButton.style.position = 'absolute';
  deleteButton.style.right = '0';

  // Remove list item after 'x' is clicked
  deleteButton.addEventListener('click', () => {
    Swal.fire({
      title: 'Remove the Habit',
      text: `Are you sure to remove "${name}" from your habit list?`,
      showCancelButton: true,
      icon: 'warning',
      confirmButtonText: 'Yes',
      cancelButtonText: 'No'
    }).then((result) => {
      if (result.isConfirmed) {
        habitList.removeChild(habitItem);
        // Add habit removal to changes array
        habitChanges.push({ type: 'remove', name: name });
        saveHabitsToFirestore();
        Swal.fire({
          title: 'Success!',
          text: `The habit '${name}' was removed successfully.`,
          icon: 'success'
        });
      }
    });
  });

  // List items
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 200 25');
  svg.classList.add('todo__icon');
  habitItem.appendChild(svg);
  habitItem.insertBefore(deleteButton, svg.nextSibling); // insert delete button after checkbox

  // Strikeout line for checking box
  const lineUse = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  lineUse.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#todo__line');
  lineUse.classList.add('todo__line');
  svg.appendChild(lineUse);

  // Checkbox
  const boxUse = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  boxUse.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#todo__box');
  boxUse.classList.add('todo__box');
  svg.appendChild(boxUse);

  // Checkmark
  const checkUse = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  checkUse.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#todo__check');
  checkUse.classList.add('todo__check');
  svg.appendChild(checkUse);

  // Creating new list-item
  const textDiv = document.createElement('div'); // New div
  textDiv.classList.add('todo__text'); // Assign todo__text class
  textDiv.textContent = name;
  habitItem.appendChild(textDiv);
  habitItem.setAttribute('data-id', id);
  habitItem.appendChild(deleteButton);
  habitList.appendChild(habitItem); // Add created list-item to array "habitList"
}



// Load the user's habit list from firestore
function loadHabitsFromFirestore() {
  firebase.auth().onAuthStateChanged(function (user) {
    if (user) { // Checks to see if user is logged in
      db.collection('users').doc(user.uid).collection('habits').get().then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          addHabitItem(doc.data().name);
        });
      }).catch((error) => {
        console.error("Error loading habits from Firestore: ", error);
      });
    }
  });
}
loadHabitsFromFirestore();


// Save the user's habit to firestore
function saveHabitsToFirestore() {
  const userID = firebase.auth().currentUser.uid;
  const dbRef = db.collection('users').doc(userID).collection('habits');

  habitChanges.forEach((change) => {
    if (change.type === 'add') {
      dbRef.add({
        name: change.name,
        count: 0,
        continious_count: 0,
        last_checked: null,
        checked: false
      }).then(() => {
        console.log('Habit added to Firestore');
      }).catch((error) => {
        console.error('Error adding habit to Firestore: ', error);
      });
    } else if (change.type === 'remove') {
      dbRef.where("name", "==", change.name).get().then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          doc.ref.delete().then(() => {
            console.log('Habit removed from Firestore');
          }).catch((error) => {
            console.error('Error removing habit from Firestore: ', error);
          });
        });
      });
    }
  });
}

function loadCheckedFromFirestore() {
  const user = firebase.auth().currentUser;
  const dbRef = db.collection('users').doc(user.uid).collection('habits');

  // Attach a "change" event listener to the parent element of all .todo__state checkboxes
  document.addEventListener('change', (event) => {
    const target = event.target;
    if (target.matches('.todo__state')) {
      const name = target.closest('.todo').querySelector('.todo__text').textContent;
      const checked = target.checked;

      // Update the checked status of the habit in Firestore
      dbRef.where("name", "==", name).get().then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          doc.ref.update({ checked: checked });
        });
      });
    }
  });

  // Load the checked status of all habits from Firestore
  dbRef.get().then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      const name = doc.data().name;
      const checked = doc.data().checked;
      const todoTextElements = document.querySelectorAll('.todo__text');
      const todoTextElement = Array.from(todoTextElements).find(element => element.textContent.includes(`${name}`));
      const parentElement = todoTextElement.closest('.todo');

      // Set the checked status of the corresponding checkbox
      const checkbox = parentElement.querySelector('.todo__state');
      checkbox.checked = checked;
    });
  });
}

window.onload = function () {
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      loadCheckedFromFirestore();
    }
  })
};

function updateHabitStats() {
  const dbRef = db.collection('users').doc(firebase.auth().currentUser.uid).collection('habits');
  const habitsToUpdate = [];
  // Get all habits and update stats for habits that were checked
  dbRef.get().then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      const habit = doc.data();
      console.log(habit);
      if (habit.checked) {
        habit.count += 1;
        habit.checked = false; // reset checked status
        habitsToUpdate.push({ id: doc.id, data: habit });
      }
    });

    // Batch update habits in Firestore
    const batch = db.batch();
    habitsToUpdate.forEach((habit) => {
      const habitRef = dbRef.doc(habit.id);
      batch.update(habitRef, habit.data);
    });
    batch.commit();
  });
}

// Run updateHabitStats() at 23:59:59 every day
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    setTimeout(() => {
      setInterval(() => {
        const now = new Date();
        if (now.getHours() === 23 && now.getMinutes() === 59 && now.getSeconds() === 59) {
          updateHabitStats();
        }
      }, 1000);
    }, 5000); // delay the interval by 5 seconds
  }
});


