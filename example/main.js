

var Application = Walrus.initialize(function($) {

    $.message = "Hello World";
    $.title = "This is a title";
    $.name = "Jorge";
    $.counter = 0;
    $.profile = {
        first_name: "Jorge",
        last_name: "Miranda",
        age: 32
    };
    
    $.todos = [
        {text: "Buy food"},
        {text: "Go to the doctor"},
        {text: "Visit grandpa"}
    ];

    $.onClick = function() {
        $.counter++;
        $.profile.age++;
    }

    $.onAddTask = function() {
        $.todos.push({
            text: "Num: " + Math.floor(Math.random() * 9999)
        });
        console.log($.todos)
    }
});
