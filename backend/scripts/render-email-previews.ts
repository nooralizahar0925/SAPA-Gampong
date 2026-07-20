import { writeEmailPreviews } from '../src/modules/notifications/templates';

writeEmailPreviews()
  .then(({ sentPath, rejectedPath }) => {
    console.log(`Wrote ${sentPath}`);
    console.log(`Wrote ${rejectedPath}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
