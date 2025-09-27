# Test Linking Feature

This is a test note to demonstrate the Obsidian-style linking functionality in TauNotes.

## Basic Links

Here are some basic links:
- [[Welcome]] - This should link to the Welcome note
- [[Getting Started|Getting Started Guide]] - This should link to Getting Started with custom display text

## Links to Non-existent Notes

- [[Non-existent Note]] - This should show as a link but won't navigate anywhere
- [[Another Missing Note|Custom Text]] - Another non-existent link with custom text

## Mixed Content

You can mix links with other markdown content like **bold text** and *italic text*.

Here's a link in the middle of a sentence: I think you should read [[Welcome]] for more information.

## Lists with Links

- First item
- Second item with [[Getting Started]] link
- Third item with [[Welcome|Welcome Note]] custom link

## Code and Links

You can also use `inline code` and links together: [[Welcome]] has some `code examples`.

```javascript
// This is a code block
function example() {
  console.log("Hello [[Welcome]]");
}
```

Notice that links inside code blocks are not processed as links - they remain as literal text.
