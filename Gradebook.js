// <![CDATA[

 //This variable holds the information about the grade categories from the students course
var categorysArray;

/*
Description: This queries the api for the students category and grade items and displays them on a page
Pre-Conditions: The page is loaded
Post-Conditions: The students grades are displayed on the screen
*/
$(document).ready(function () {
    var currentCourseID = getCurrentCourseID();
    var versionNumber = "1.5";
    //When getGradeItemAPICall deferred ajax call is resovled
    $.when(getGradeItemsAPICall(currentCourseID, versionNumber)).done(function (gradeItemsArray) {
        categorysArray = createCategorysArray(gradeItemsArray);
        //When getGradedItemsAPICall deferred ajax call is resovled
        $.when(getGradedItemsAPICall(currentCourseID, versionNumber)).done(function (gradedItemsAPICallArray) {
            categorysArray = setGradeItemsGradeReceivedProperty(gradedItemsAPICallArray, categorysArray);
            displayAssignments();
        });
    });
});

/*
Description: This function gets the url of the parent window to find out the users current course Id
Pre-conditions: The page has been loaded by clicking on the show all button in the recently graded assignments widget
Post-condtions: The current course ID is returned
*/
function getCurrentCourseID() {
//  return ((parent.window.location.href).split("/"))[6];
    return ((parent.window.location.href).split("="))[1];
}

/*
Description: This function returns a deferred ajax call for retrieving the courses categories and grade items
Pre-conditions: The currentCourseID, and the versionNumber of the API
Post-condtions: A deferred ajax call is returned
*/
function getGradeItemsAPICall(currentCourseID, versionNumber) {
    return $.ajax('/d2l/api/le/' + versionNumber + '/' + currentCourseID + '/grades/categories/', {
        dataType: 'json',
        headers: { 'X-Csrf-Token': localStorage['XSRF.Token'] }
    });
}

/*
Description: This function creates an array of categories 
Pre-conditions: A gradeItemsArray which is an array from this ajax call made in the GetGradeItemAPICall function
Post-condtions: An array of categories with each category having an array of grade items
*/
function createCategorysArray(gradeItemsArray) {
    var categoryGradeItemsArray = [];
    var i = 0;
    while (i < gradeItemsArray.length) {
        var category = manipulatePropertiesFromGradeItems(gradeItemsArray[i]);
        categoryGradeItemsArray.push(category);
        i++;
    }
    return categoryGradeItemsArray;
}

/*
Description: This function removes unecessary properties from the categories and grade items it also adds a few properties
Pre-conditions: A category object from the gradeItemsArray
Post-condtions: The same category object that has a property added for each grade item named GradeReceived
*/
function manipulatePropertiesFromGradeItems(category) {
    //converts the categories weight number into a decimal percent
    category.Weight /= 100;
    var i = 0;
    //iterates through each of the categories grade items
    while (i < category.Grades.length) {
        //filters out any text type grade objects
        if (category.Grades[i].GradeType != "Text") {
            category.Grades[i].Weight /= 10;
            category.Grades[i].GradeReceived = null;
        }
        //if they are text type grade objects they are removed
        else {
            category.Grades[i].splice(i, 1);
            i--;
        }
        i++;

    }
    return category;
}

/*
Description: This function gets a deferred ajax call to return the current students graded grade objects
Pre-conditions: The currentCourseID, and the version number of the API
Post-condtions: It returns a deferred ajax call that will retrieve the graded grade objects for the current student
*/
function getGradedItemsAPICall(currentCourseID, versionNumber) {
    
    return $.ajax('/d2l/api/le/' + versionNumber + '/' + currentCourseID + '/grades/values/myGradeValues/', {
        dataType: 'json',
        headers: { 'X-Csrf-Token': localStorage['XSRF.Token'] }
    });
}

/*
Description: This function updates each grade items gradeReceived property if it has been graded
Pre-conditions: The results of the getGradedItemsAPICall ajax call, and a gradeItemsArray
Post-condtions: Every grade object that has been graded has its GradeReceived property updated
*/
function setGradeItemsGradeReceivedProperty(gradeAPICallArray, categoryGradeItemsArray) {
    var i = 0;
    //iterates through each of the graded grade objects
    while (i < gradeAPICallArray.length) {
        var j = 0;
        //iterates through each of the categories
        while (j < categoryGradeItemsArray.length) {
            var k = 0;
            //used to break out of the whlie when the corresponding grade item object is found
            var gradeItemFound = false;
            //iterates through each of the categories grade item objects
            while (k < categoryGradeItemsArray[j].Grades.length) {
                //if the graded grade objects id is equal to this grade item
                if (gradeAPICallArray[i].GradeObjectIdentifier == categoryGradeItemsArray[j].Grades[k].Id) {
                    //if this grade item object is not a bonus grade item
                    if (!(categoryGradeItemsArray[j].Grades[k].IsBonus)) {
                        categoryGradeItemsArray[j].Grades[k].GradeReceived = (gradeAPICallArray[i].WeightedNumerator / gradeAPICallArray[i].WeightedDenominator) * 100;
                    }
                    //if this grade item object is a bonus grade item
                    else {
                        categoryGradeItemsArray[j].Grades[k].GradeReceived = (gradeAPICallArray[i].PointsNumerator / gradeAPICallArray[i].PointsDenominator) * 100;
                    }
                    gradeItemFound = true;
                    break;
                }
                k++;
            }
            if (gradeItemFound) {
                break;
            }
            j++;
        }
        i++;
    }
    return categoryGradeItemsArray;
}

/*
Description: This function displays the assignments on the screen, and allows the user to calculate their final grade
Pre-conditions: An array of categories that have an array gradeItems
Post-condtions: The students grades are displayed on the screen
*/
var displayAssignments = function () {
    
    var totalWeightAchieved = 0;
    
    /*
      Description: Displays both graded and ungraded assignments on the screen
      Pre-conditions: Page loaded first time, student clicks on show all button
      Post-condtions: Both ungraded and graded assignments are displayed on the page
    */
    var gradedOrNot = function () {
        totalWeightAchieved = 0;
        for (var i = 0; i < categorysArray.length; i++) {
            var categoryDiv = document.createElement("div");
            var categoryTitle = document.createElement("h3");
            var gradeList = document.createElement("ul");
            categoryDiv.className = "Category";
            categoryDiv.setAttribute("id", "cat" + i);
            
            //Stores important information about the category in the categories div for the what if calculator
            $.data(categoryDiv, "categoryData", {
                CanExeed: categorysArray[i].CanExceedMax,
                Weight: categorysArray[i].Weight
            });
            
            var totalCategoryWeightAchieved = 0;
            var nonBonusGradeItems = 0;
            //This for loop counts the number of nonBonusGradeItems that are graded in this category
            for (var j = 0; j < categorysArray[i].Grades.length; j++) {
                
                if (categorysArray[i].Grades[j].GradeReceived != null) {
                    //if this assignment is greater than 100 and it can't be set the GradeReceived to 100
                    if (!(categorysArray[i].Grades[j].CanExceedMaxPoints) && categorysArray[i].Grades[j].GradeReceived > 100) {
                        categorysArray[i].Grades[j].GradeReceived = 100;
                    }
                    if (!(categorysArray[i].Grades[j].IsBonus)) {
                        nonBonusGradeItems++;
                    }
                    //If it is bonus calculate the weight this bonus item will have in the category
                    //Add the weight to the categories total weight
                    else {
                        totalCategoryWeightAchieved += (categorysArray[i].Grades[j].GradeReceived * (categorysArray[i].Grades[j].Weight / 10));
                    }
                }
                
                var gradeItem = document.createElement("li");
                var gradeItemTitle = document.createElement("div");
                var gradeItemGrade = document.createElement("div");
                var gradeItemPercentage = document.createElement("span");
                gradeItemGrade.className = "GradeItem";
                gradeItemTitle.innerHTML = categorysArray[i].Grades[j].Name;
                
                var isGraded;
                //Displays not graded if it hasn't been graded
                if (categorysArray[i].Grades[j].GradeReceived == null) {
                    gradeItemPercentage.innerHTML = "Not Graded";
                    isGraded = false;
                }
                //Displays the grade they got if it was graded
                else {
                    gradeItemPercentage.innerHTML = ((categorysArray[i].Grades[j].GradeReceived * 100) / 100).toFixed(2) + "%";
                    isGraded = true;
                }
                
                //Adding data to the grade item divs to hold important information for the what if calculator
                $.data(gradeItemGrade, "gradeItemData", {
                    CanExeed: categorysArray[i].Grades[j].CanExceedMaxPoints,
                    Weight: categorysArray[i].Grades[j].Weight,
                    IsGraded: isGraded,
                    IsBonus: categorysArray[i].Grades[j].IsBonus,
                    GradeReceived: categorysArray[i].Grades[j].GradeReceived
                });
                
                gradeItem.appendChild(gradeItemTitle);
                gradeItemGrade.appendChild(gradeItemPercentage);
                gradeItem.appendChild(gradeItemTitle);
                gradeItem.appendChild(gradeItemGrade);
                gradeList.appendChild(gradeItem);
            }
            var k = 0;
            //calculates how much each assignment in the category is weighted
            var assignmentWeight = (100 / nonBonusGradeItems) / 100;
            //This while loop calculates how much weight the student achieved in the category
            while (k < categorysArray[i].Grades.length) {
                if (categorysArray[i].Grades[k].GradeReceived != null) {
                    if (!(categorysArray[i].Grades[k].IsBonus)) {
                        totalCategoryWeightAchieved += categorysArray[i].Grades[k].GradeReceived * assignmentWeight;
                    }
                }
                k++;
            }
            totalWeightAchieved += totalCategoryWeightAchieved * categorysArray[i].Weight;
            categoryTitle.innerHTML = categorysArray[i].Name;
            categoryDiv.appendChild(categoryTitle);
            categoryDiv.appendChild(gradeList);
            $(".content").append(categoryDiv);
            
            $("#cat" + i + " h3").click(function () {
                $(this).parent().children("ul").slideToggle();
            });
        }
        
        //Calculates and displays the current grade
        var gr = "Current grade: " + ((totalWeightAchieved * 100) / 100).toFixed(2) + "%";
        $("h4.overallGrade").text(gr);

    }
    
    /*
      Description: Displays only graded assignments on the screen
      Pre-conditions: student clicks on graded only button
      Post-condtions: Only Graded assignments are displayed on the page
    */
    var gradedOnly = function () {
        
        for (var i = 0; i < categorysArray.length; i++) {
            var categoryDiv = document.createElement("div");
            var categoryTitle = document.createElement("h3");
            var gradeList = document.createElement("ul");
            categoryDiv.className = "Category";
            categoryDiv.setAttribute("id", "cat" + i);
            console.log(categorysArray[0].Grades[0].Name);
            for (var j = 0; j < categorysArray[i].Grades.length; j++) {
                
                var gradeItem = document.createElement("li");
                var gradeItemTitle = document.createElement("div");
                var gradeItemGrade = document.createElement("div");
                var gradeItemPercentage = document.createElement("span");
                gradeItemTitle.innerHTML = categorysArray[i].Grades[j].Name;
                
                if (categorysArray[i].Grades[j].GradeReceived == null)
                    gradeItemPercentage.innerHTML = "Not Graded";
                else {
                    gradeItemPercentage.innerHTML = ((categorysArray[i].Grades[j].GradeReceived * 100) / 100).toFixed(2) + "%";
                }
                
                gradeItem.appendChild(gradeItemTitle);
                gradeItemGrade.appendChild(gradeItemPercentage);
                gradeItem.appendChild(gradeItemTitle);
                gradeItem.appendChild(gradeItemGrade);
                if (categorysArray[i].Grades[j].GradeReceived !== null)
                    gradeList.appendChild(gradeItem);
            }
            categoryTitle.innerHTML = categorysArray[i].Name;
            categoryDiv.appendChild(categoryTitle);
            categoryDiv.appendChild(gradeList);
            $(".content").append(categoryDiv);
            
            $("#cat" + i + " h3").click(function () {
                $(this).parent().children("ul").slideToggle();
            });
        }
        var gr = "Current grade: " + ((totalWeightAchieved * 100) / 100).toFixed(2) + "%";
        $("h4.overallGrade").text(gr);

    }
    /*
      Description: Displays only ungraded assignments on the screen
      Pre-conditions: Students clicks on not graded button
      Post-condtions: The ungraded assignments are shown on the screen
    */
    var notGradedOnly = function () {
        
        
        for (var i = 0; i < categorysArray.length; i++) {
            var categoryDiv = document.createElement("div");
            var categoryTitle = document.createElement("h3");
            var gradeList = document.createElement("ul");
            categoryDiv.className = "Category";
            categoryDiv.setAttribute("id", "cat" + i);
            console.log(categorysArray[0].Grades[0].Name);
            for (var j = 0; j < categorysArray[i].Grades.length; j++) {
                
                var gradeItem = document.createElement("li");
                var gradeItemTitle = document.createElement("div");
                var gradeItemGrade = document.createElement("div");
                var gradeItemPercentage = document.createElement("span");
                gradeItemTitle.innerHTML = categorysArray[i].Grades[j].Name;
                
                if (categorysArray[i].Grades[j].GradeReceived == null)
                    gradeItemPercentage.innerHTML = "Not Graded";
                else {
                    gradeItemPercentage.innerHTML = ((categorysArray[i].Grades[j].GradeReceived * 100) / 100).toFixed(2) + "%";
                }
                
                gradeItem.appendChild(gradeItemTitle);
                gradeItemGrade.appendChild(gradeItemPercentage);
                gradeItem.appendChild(gradeItemTitle);
                gradeItem.appendChild(gradeItemGrade);
                if (categorysArray[i].Grades[j].GradeReceived == null)
                    gradeList.appendChild(gradeItem);
            }
            categoryTitle.innerHTML = categorysArray[i].Name;
            categoryDiv.appendChild(categoryTitle);
            categoryDiv.appendChild(gradeList);
            $(".content").append(categoryDiv);
            
            $("#cat" + i + " h3").click(function () {
                $(this).parent().children("ul").slideToggle();
            });
        }
        var gr = "Class grade: " + ((totalWeightAchieved * 100) / 100).toFixed(2) + "%";
        $("h4.overallGrade").text(gr);
    }
    
    /*
    Description: This function adds text boxes for each assignment that is not graded, also adds a calculate button
    Pre-conditions: The what if calculator button is pressed
    Post-conditions: The page displays the not graded items as text boxes, and a calculate button
    */
    var createWhatIfCalculator = function () {
        $(".content").empty();
        gradedOrNot();
        //Gets an array of all grade items
        var gradeItems = document.getElementsByClassName("GradeItem");
        //This for loop iterates through all of the grade items, and puts text boxes where grade items are not graded
        for (var i = 0; i < gradeItems.length; i++) {
            if (!($.data(gradeItems[i], "gradeItemData").IsGraded)) {
                gradeItems[i].children[0].remove();
                var input = document.createElement("input");
                input.setAttribute("type", "number");
                gradeItems[i].appendChild(input);
            }
        }
        
        //Creates a calculate button for the user to press to calculate their final grade
        var calculateButton = document.createElement("button");
        calculateButton.className = "cd-top";
        calculateButton.setAttribute("id", "calculateButton");
        calculateButton.innerHTML = "Calculate";
        
        $(".content").append(calculateButton);
        
        /*
        Description: A click function for the calculate button
        Pre-conditions: The what if calculator button has been pressed, and the calculate button has been created
        Post-condtions: Calls the myScroll Fucntion, and setGradeReceivedValues function
        */
        $("#calculateButton").click(function () {
            myScroll();
            setGradeRecievedValues();
        });
    };
    
    /*
    Description: This function sets the GradeReceived property of the grade items that the user entered in the text boxes
    Pre-conditions: The calculate button is pressed for the what if calculator
    Post-condtions: The GradeReceived property is set to the value the user entered in the text boxes
    */
    var setGradeRecievedValues = function () {
        var gradeItemsArray = document.getElementsByClassName("GradeItem");
        //This for loop iterates through all the grade items and sets the previously ungraded grade items to the value in their textbox
        for (var i = 0; i < gradeItemsArray.length; i++) {
            if (gradeItemsArray[i].children[0].localName == "input") {
                //If the user entered in a number in the text box
                if (!(isNaN(gradeItemsArray[i].children[0].valueAsNumber))) {
                    if (gradeItemsArray[i].children[0].valueAsNumber > 100 && !($.data(gradeItemsArray[i], "gradeItemData").CanExceed)) {
                        $.data(gradeItemsArray[i], "gradeItemData").GradeReceived = 100;
                    }
                    else {
                        $.data(gradeItemsArray[i], "gradeItemData").GradeReceived = gradeItemsArray[i].children[0].valueAsNumber;
                    }
                }
                //If the user didn't enter in any grade or a value that is not a number in the  text box
                else {
                    $.data(gradeItemsArray[i], "gradeItemData").GradeReceived = null;
                }
            }
        }
        calculateFinalGrade();
    }
    
    /*
    Description: This function calculates the final grade for the user based on user inputed values
    Pre-conditions: The setGradeReceivedValues calls this function
    Post-condtions: The estimated final grade is displayed on the page
    */
    var calculateFinalGrade = function () {
        var categories = document.getElementsByClassName("Category");
        var totalWeightAchieved = 0;
        //This for loop iterates through all of the categories 
        for (var i = 0; i < categories.length; i++) {
            //Gets an array of all grade items for this category
            var gradeItemsArray = $(categories[i]).find(".GradeItem");
            var totalCategoryWeightAchieved = 0;
            var nonBonusGradeItems = 0;
            //This for loop iterastes through all of the grade items in the category
            for (var j = 0; j < gradeItemsArray.length; j++) {
                //if the item has been graded
                if ($.data(gradeItemsArray[j], "gradeItemData").GradeReceived != null) {
                    //If the grade item has not been graded by the teacher
                    if (!($.data(gradeItemsArray[j], "gradeItemData").IsGraded)) {
                        if ($.data(gradeItemsArray[j], "gradeItemData").IsBonus) {
                            totalCategoryWeightAchieved += $.data(gradeItemsArray[j], "gradeItemData").GradeReceived * ($.data(gradeItemsArray[j], "gradeItemData").Weight / 10);
                        }
                        else {
                            nonBonusGradeItems++;
                        }

                    }
                    //If the grade item was graded by the teacher
                    else {
                        if ($.data(gradeItemsArray[j], "gradeItemData").IsBonus) {
                            totalCategoryWeightAchieved += $.data(gradeItemsArray[j], "gradeItemData").GradeReceived * ($.data(gradeItemsArray[j], "gradeItemData").Weight / 10);
                        }
                        else {
                            nonBonusGradeItems++;
                        }
                    }
                }

            }
            var k = 0;
            //Calculates what each non bonus grade items weight will be
            var assignmentWeight = (100 / nonBonusGradeItems) / 100;
            //This while loop calculates the totalCategoryWeightAchieved
            while (k < gradeItemsArray.length) {
                //if there is a grade set
                if ($.data(gradeItemsArray[k], "gradeItemData").GradeReceived != null) {
                    //if the grade item is not bonus
                    if (!($.data(gradeItemsArray[k], "gradeItemData").IsBonus)) {
                        totalCategoryWeightAchieved += $.data(gradeItemsArray[k], "gradeItemData").GradeReceived * assignmentWeight;
                    }
                }
                k++;
            }
            
            //This adds onto the totalWeightAchieved the weight the student acheived in the category
            totalWeightAchieved += totalCategoryWeightAchieved * $.data(categories[i], "categoryData").Weight;
        }
        var hi = "Estimated grade: " + ((totalWeightAchieved * 100) / 100).toFixed(2) + "%";
        $("h4.overallGrade").text(hi);

    };
    
    //Calls this function the first time the page loads
    gradedOrNot();
    
    
    //Shows only the first two categories
    for (var i = 2; i < categorysArray.length; i++) {
        $("#cat" + i + " h3").parent().children("ul").slideToggle();
    }
    
    /*
    Description: A click function for when the all button is pressed
    Pre-conditions: All button is pressed
    Post-condtions: Calls the gradedOrNot function
    */
    $("#gn").click(function () {
        $(".content").empty();
        gradedOrNot();
    });
    
    /*
    Description: A click function for when the graded only button is pressed
    Pre-conditions: graded only button is pressed
    Post-condtions: Calls the gradedOnly function
    */
    $("#g").click(function () {
        $(".content").empty();
        gradedOnly()
    });
    
    /*
    Description: A click function for when the notGraded only button is pressed
    Pre-conditions: notGraded only button is pressed
    Post-condtions: Calls the notGradedOnly button
    */
    $("#n").click(function () {
        $(".content").empty();
        notGradedOnly();
    });
    
    /*
    Description: A click function for when calculator button is pressed
    Pre-conditions: Calculator button is pressed
    Post-condtions: calls the createWhatIfCalculator function
    */
    $("#Calculator").click(function () {
        createWhatIfCalculator();
    });
    
    /*
    Description: A click function for when the calculateButton is pressed, may be a duplicate unNeeded function, can't be sure because I can't test it now
    Pre-conditions: Calculate button is pressed
    Post-condtions: Calls the setGradeReceivedValues functoin
    */
    $("#calculateButton").click(function () {
        setGradeRecievedValues();
    });
    
    /*
    Description: Scrolls to the top of the page
    Pre-conditions: Back to top link is pressed
    Post-condtions: Scrolls to the top of the page
    */
    var myScroll = function () {
        // browser window scroll (in pixels) after which the "back to top" link is shown
        var offset = 300,
        //browser window scroll (in pixels) after which the "back to top" link opacity is reduced
            offset_opacity = 1200,
        //duration of the top scrolling animation (in ms)
            scroll_top_duration = 700,
        //grab the "back to top" link
            $back_to_top = $('.cd-top');
        
        //hide or show the "back to top" link
        $(window).scroll(function () {
            ($(this).scrollTop() > offset) ? $back_to_top.addClass('cd-is-visible') : $back_to_top.removeClass('cd-is-visible cd-fade-out');
            if ($(this).scrollTop() > offset_opacity) {
                $back_to_top.addClass('cd-fade-out');
            }
        });
        
        //smooth scroll to top
        $back_to_top.on('click', function (event) {
            event.preventDefault();
            $('body,html').animate({
                scrollTop: 0
            }, scroll_top_duration
            );
        });
    };

};

// ]]>