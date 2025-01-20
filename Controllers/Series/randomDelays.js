export default function randomDelays(min, max) {
    return new Promise((resolve) => {
      setTimeout(resolve, min + Math.random() * (max - min));
    });
  }