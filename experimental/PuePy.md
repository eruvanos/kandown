# Some information regarding PuePy

Puepy is a Python web framework designed for building reactive web applications, often targeting PyScript or WASM
environments. It uses a component-based architecture and provides tools for templating and state management, similar to
frontend JavaScript frameworks but in Python.

## State and Variables

The html and pyscript configuration are the same as in the previous Hello, World chapter, so we will only study the
Python code. Expand the annotations in the code below for a more detail explanation of the changes:

```python
from puepy import Application, Page, t

app = Application()


@app.page()
class HelloNamePage(Page):
    def initial(self):
        return {"name": ""}  # 

    def populate(self):
        if self.state["name"]:  # 
            t.h1(f"Hello, {self.state['name']}!")
        else:
            t.h1(f"Why don't you tell me your name?")

        with t.div(style="margin: 1em"):
            t.input(bind="name", placeholder="name", autocomplete="off")  # 


app.mount("#app")
```

Reactivity
A page or component's initial state is defined by the initial() method. If implemented, it should return a dictionary,
which is then stored as a special reactive dictionary, self.state. As the state is modified, the component redraws,
updating the DOM as needed.

## Events

In this example, we bind two events to event handlers. Follow along with the annotations in the code below for a more
detailed explanation:

```python
from puepy import Application, Page, t

app = Application()


@app.page()
class CounterPage(Page):
    def initial(self):
        return {"current_value": 0}

    def populate(self):
        with t.div(classes="button-box"):
            t.button("-",
                     classes=["button", "decrement-button"],
                     on_click=self.on_decrement_click)  # 
            t.span(str(self.state["current_value"]), classes="count")
            t.button("+",
                     classes="button increment-button",
                     on_click=self.on_increment_click)  # 

    def on_decrement_click(self, event):
        self.state["current_value"] -= 1  # 

    def on_increment_click(self, event):
        self.state["current_value"] += 1  # 


app.mount("#app")
```

The event parameter sent to event handlers is the same as it is in JavaScript. You can call event.preventDefault() or
event.stopPropagation() as needed.

As before, because we are modifying the state directly, the page will re-render automatically. This is the power of
PuePy's reactivity system.

## Using Refs

Using refs to preserve elements between refreshes
To tell PuePy not to garbage collect an element, but to reuse it between redraws, just give it a ref= parameter. The ref
should be unique to the component you're coding: that is, each ref should be unique among all elements created in the
populate() method you're writing.

When PuePy finds an element with a ref, it will reuse that ref if it existed in the last refresh, modifying it with any
updated parameters passed to it.

```python
@app.page()
class RefsSolutionPage(Page):
    def initial(self):
        return {"word": ""}

    def populate(self):
        t.h1("Solution: Use ref=")
        if self.state["word"]:
            for char in self.state["word"]:
                t.span(char, classes="char-box")
        with t.div(style="margin-top: 1em"):
            t.input(bind="word", placeholder="Type a word", ref="enter_word")
```

## Watchers

In PuePy, you can use on_<variable>_change methods in your components to watch for changes in specific variables. In the
example below, try guessing the number 4:

```python
@app.page()
class WatcherPage(Page):
    def initial(self):
        self.winner = 4

        return {"number": "", "message": ""}

    def populate(self):
        t.h1("Can you guess a number between 1 and 10?")

        with t.div(style="margin: 1em"):
            t.input(bind="number", placeholder="Enter a guess", autocomplete="off", type="number", maxlength=1)

        if self.state["message"]:
            t.p(self.state["message"])

    def on_number_change(self, event):  # 
        try:
            if int(self.state["number"]) == self.winner:
                self.state["message"] = "You guessed the number!"
            else:
                self.state["message"] = "Keep trying..."
        except (ValueError, TypeError):
            self.state["message"] = ""
```

The watcher method itself changes the self.state["message"] variable based on the value of self.state["number"]. If the
number is equal to the self.winner constant, the message is updated to "You guessed the number!" Otherwise, the message
is set to "Keep trying...". The state is once again changed and the page is re-rendered.

## Components

Components are a way to encapsulate a piece of UI that can be reused throughout your application. In this example, we'll
create a Card component and use it multiple times on a page, each time using slots to fill in content.

```python

@t.component()
class Card(Component):
    props = ["type", "button_text"]

    card = CssClass(
        margin="1em",
        padding="1em",
        background_color="#efefef",
        border="solid 2px #333",
    )

    default_classes = [card]

    type_styles = {
        "success": success,
        "warning": warning,
        "error": error,
    }

    def populate(self):
        with t.h2(classes=[self.type_styles[self.type]]):
            self.insert_slot("card-header")
        with t.p():
            self.insert_slot()
        t.button(self.button_text, on_click=self.on_button_click)

    def on_button_click(self, event):
        self.trigger_event("my-custom-event",
                           detail={"type": self.type})


@app.page()
class ComponentPage(Page):
    def initial(self):
        return {"message": ""}

    def populate(self):
        t.h1("Components are useful")

        with t.card(type="success",  # 
                    on_my_custom_event=self.handle_custom_event) as card:  # 
            with card.slot("card-header"):
                t("Success!")  # 
            with card.slot():
                t("Your operation worked")  # 

        with t.card(type="warning", on_my_custom_event=self.handle_custom_event) as card:
            with card.slot("card-header"):
                t("Warning!")
            with card.slot():
                t("Your operation may not work")

        with t.card(type="error", on_my_custom_event=self.handle_custom_event) as card:
            with card.slot("card-header"):
                t("Failure!")
            with card.slot():
                t("Your operation failed")

        if self.state["message"]:
            t.p(self.state["message"])

    def handle_custom_event(self, event):  # 
        self.state["message"] = f"Custom event from card with type {event.detail.get('type')}"
```

### Slots

Slots are a way to pass content into a component. A component can define one or more slots, and the calling code can
fill in the slots with content. In the example above, the Card component defines two slots: card-header and the default
slot. The calling code fills in the slots by calling card.slot("card-header") and card.slot().

**Define slots in a component**

```python
with t.h2():
    self.insert_slot("card-header")
with t.p():
    self.insert_slot()  #
```

**Fill in slots when using a component**

```python
with t.card() as card:
    with card.slot("card-header"):
        t("Success!")
    with card.slot():
        t("Your operation worked")
```

> When consuming components with slots, to populate a slot, you do not call t.slot. You call .slot directly on the
> component instance provided by the context manager

## In-Depth Components

**Component Definition**  
Components encapsulate data, display, and logic, making them reusable entities.

Use the `populate()` method to define slots, props, and events for component structure and behavior.

**Data Flow Mechanisms**

- **Slots**: Enable parent components to inject content into child components at specified positions. Use
  `self.insert_slot` in the component code and `<component>.slot()` when consuming the component.
- **Props**: Pass data to child components. Props can be declared as simple strings for names or as `Prop` instances to
  add metadata. All props can be accessed as expanded dictionary on `self.props_expanded`.
- **Attributes**: Any keyword arguments to a component not matching a prop are treated as attributes and are added
  directly to the rendered HTML element, useful for HTML-specific customization.
- **Events**: Allow child components to notify parent components via custom events. Emit events using
  `self.trigger_event` and handle them in the parent with methods like `on_greeting`.

**Customization**  
You can customize rendering via the `enclosing_tag`, and define `default_classes`, `default_attributes`, and
`default_role` for components.

**Hierarchical Relationships**  
Each tag or component has a parent unless it is the root page. Use:

- `self.page` – The page instance overseeing rendering.
- `self.origin` – The component/page that created the current one.
- `self.parent` – The direct parent tag/component.

Parent components provide `self.children` (list of direct children) and `self.refs` (dictionary of references created
during `populate`).

**References (Refs)**  
Use the `ref=` argument to assign references to created child tags/components. Access them later via
`self.refs["ref_name"]`.

This structured summary enables efficient coding agent automation and integration for PuePy component creation routines.

## CssClass

```markdown
# CSS Classes in PuePy

- While custom CSS is user-managed, PuePy offers flexible mechanisms for assigning classes due to `class` being reserved
  in Python.
- Use `class_name` or `classes` when specifying classes for tags/components:
    - As a string: `class_name="primary large"`
    - As a list: `classes=["primary", "small"]`
    - As a dict: `classes={"primary": True, "medium": True, "small": False, "large": False}` (value determines
      inclusion)
- Components may specify `default_classes`, e.g.:
```

default_classes = ["card"]

```
- User code can add to or override component default classes at use time.
- To remove a default class, prefix it with `/`:
- `t.card(classes="card-blue")` will render with both "card" and "card-blue"
- `t.card(classes="/card")` will explicitly remove the "card" class[attached_file:1][web:12]
```

Classes can be defined programmatically in Python using the CssClass helper.
Class names are automatically generated for each instance, so they're scoped like Python instances.

```python
CssClass(
    margin="1em",
    padding="1em",
    background_color="#efefef",
    border="solid 2px #333",
)
```

## Reactivity

Reactivity is a paradigm that causes the user interface to update automatically in response to changes in the
application state. In PuePy, reactivity is inspired by Vue.js and ensures that UI redraws are triggered whenever the
state changes, without manual intervention.

### State

- **Initial State**: Components and Pages define their initial state using the `initial()` method, which returns a
  dictionary. This dictionary is stored as a reactive state object (`self.state`).
- **Modifying State**: Any assignment to `self.state` keys will trigger a UI refresh. For example,
  `self.state["name"] = "Monty Python"` will update the UI automatically.
- **Modifying Mutable Objects**: PuePy's reactivity cannot detect in-place changes to nested mutable objects. To ensure
  UI updates, use the `mutate()` context manager: `with self.state.mutate("movies"): ...`.

### Controlling UI Refresh

- **Disabling Automatic Refresh**: Set `redraw_on_changes = False` to disable automatic refresh. You can manually
  trigger a redraw with `self.trigger_redraw()` or `self.page.trigger_redraw()`.
- **Limiting Automatic Refresh**: Set `redraw_on_changes = ["items"]` to only refresh the UI when specific state keys
  change.

### Watching for Changes

- **Watchers**: Define `on_<key>_change(self, new_value)` to react to changes in specific state keys. Use
  `on_state_change(self, key, value)` to react to any state change.

### Binding Form Values

- Use the `bind` parameter in form elements to create two-way bindings between input values and state keys. For example:
  `t.input(bind="name")`.

### Application State

- PuePy provides a global application state via `application.state`. Changes to this state also trigger UI refreshes.
  Control this behavior with `redraw_on_app_state_changes` on components or pages.

## Known Issues

- Components and Page do not provide a `trigger_redraw()` method. Use `self.redraw_tag(self)` instead.
- Components receive a `on_ready` event, when they are fully rendered. This can be used to trigger further events which
  can be used to trigger JS events to trigger async functions. Usefull for loading data from an API. This is not
  documented yet.

